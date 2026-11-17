<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentAccess;
use App\Models\DocumentRecipient;
use App\Models\Subject;
use App\Models\User;
use App\Services\AuditService;
use App\Services\DocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    /**
     * المستخدمين المتاح التحويل لهم في نفس القسم (للتوافق القديم)
     */
    private function forwardableUsers(User $user, Document $document): Collection
    {
        $query = User::query()
            ->where('status', 'active')
            ->whereNotNull('department_id')
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', $document->recipients()->pluck('user_id'));

        if (!$user->isSuperAdmin()) {
            if (!$user->department_id) {
                return collect();
            }

            $query->where('department_id', $user->department_id);
        }

        return $query->with('department:id,name')
            ->orderBy('department_id')
            ->orderBy('order_num')
            ->get(['id', 'name', 'department_id', 'order_num']);
    }

    /**
     * مين يقدر يحوّل ويوقع ويتحكم في المستند:
     * السوبر أدمن، أو من قام بالرفع، أو أي مستلم أو من تم منحه صلاحية وصول
     */
    private function canForward(User $user, Document $document): bool
    {
        return $user->isSuperAdmin()
            || $document->uploaded_by === $user->id
            || $document->recipients()->where('user_id', $user->id)->exists()
            || $document->accessList()->where('user_id', $user->id)->exists()
            || ($user->department_id && $user->department_id === $document->department_id);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Document::accessibleBy($user)
            ->with(['department', 'category', 'type', 'latestVersion', 'tags']);

        if ($search = $request->input('search')) {
            $query->search($search);
        }

        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }

        if ($catId = $request->input('category_id')) {
            $query->where('category_id', $catId);
        }

        if ($direction = $request->input('direction')) {
            $query->where('direction', $direction);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($request->boolean('unread')) {
            $query->whereHas('recipients', fn($q) => $q
                ->where('user_id', $user->id)
                ->where('status', 'pending'));
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('doc_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('doc_date', '<=', $dateTo);
        }

        $documents = $query->latest('id')->paginate(12)->withQueryString();

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'department_id', 'category_id', 'direction', 'status', 'unread', 'date_from', 'date_to']),
            'counts' => [
                'incoming' => Document::accessibleBy($user)->where('direction', 'incoming')->count(),
                'outgoing' => Document::accessibleBy($user)->where('direction', 'outgoing')->count(),
                'pending'  => Document::accessibleBy($user)->where('status', 'pending')->count(),
                'finish'   => Document::accessibleBy($user)->where('status', 'finish')->count(),
            ],
            'departments' => Department::all(['id', 'name']),
            'categories' => Category::all(['id', 'name', 'parent_id', 'department_id']),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        Gate::authorize('create', Document::class);

        $departments = $user->isSuperAdmin()
            ? Department::all()
            : Department::where('id', $user->department_id)->get();

        $categories = Category::query();
        if (!$user->isSuperAdmin() && $user->department_id) {
            $categories->where(function ($q) use ($user) {
                $q->whereNull('department_id')->orWhere('department_id', $user->department_id);
            });
        }

        $recipientDepartments = Department::query()
            ->with(['users' => function ($q) {
                $q->where('status', 'active')
                    ->orderBy('order_num')
                    ->select('id', 'name', 'department_id', 'order_num');
            }])
            ->orderBy('name')
            ->get(['id', 'name']);

        $subjectsQuery = Subject::query();
        if (!$user->isSuperAdmin() && $user->department_id) {
            $subjectsQuery->where('department_id', $user->department_id);
        }
        $subjects = $subjectsQuery->get();

        return Inertia::render('documents/create', [
            'departments' => $departments,
            'subjects' => $subjects,
            'categories' => $categories->get(),
            'defaultDepartmentId' => $user->department_id,
            'recipientDepartments' => $recipientDepartments,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('create', Document::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'reference_no' => ['nullable', 'string', 'max:100', 'unique:documents,reference_no'],
            'doc_date' => ['required', 'date'],
            'direction' => ['required', 'in:incoming,outgoing'],
            'department_id' => ['required', 'exists:departments,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'subject_id' => [
                'required',
                'exists:subjects,id',
                function ($attribute, $value, $fail) use ($request) {
                    $exists = Subject::where('id', $value)
                        ->where('department_id', $request->department_id)
                        ->exists();

                    if (!$exists) {
                        $fail('الموضوع المختار لا ينتمي للقسم المحدد.');
                    }
                },
            ],
            'file' => ['required', 'file', 'max:51200'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'recipients' => ['nullable', 'array'],
            'recipients.*.department_id' => ['required', 'distinct', 'exists:departments,id'],
            'recipients.*.user_ids' => ['required', 'array', 'min:1'],
            'recipients.*.user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ], [
            'recipients.*.user_ids.required' => 'اختر عضواً واحداً على الأقل في كل قسم.',
            'recipients.*.user_ids.min' => 'اختر عضواً واحداً على الأقل في كل قسم.',
            'recipients.*.department_id.required' => 'اختر القسم.',
            'recipients.*.department_id.distinct' => 'القسم مكرر.',
            'subject_id.required' => 'اختر موضوع المستند.',
        ]);

        $recipients = $validated['recipients'] ?? [];
        $comment = trim((string) ($validated['comment'] ?? ''));
        $direction = $validated['direction'];
        unset($validated['recipients'], $validated['comment'], $validated['direction']);

        foreach ($recipients as $i => $block) {
            $validCount = User::whereIn('id', $block['user_ids'])
                ->where('department_id', $block['department_id'])
                ->where('status', 'active')
                ->count();

            if ($validCount !== count($block['user_ids'])) {
                return back()->withErrors([
                    "recipients.{$i}.user_ids" => 'يوجد عضو غير تابع للقسم المختار أو غير نشط.',
                ])->withInput();
            }
        }

        if (!$user->isSuperAdmin() && $user->department_id) {
            $validated['department_id'] = $user->department_id;
        }

        // الحالة تبدأ دائماً بـ pending (قيد الإجراء)
        $validated += [
            'type_id' => null,
            'status' => 'pending',
            'tags' => [],
            'change_notes' => 'النسخة الأصلية الأولى',
        ];

        $document = DB::transaction(function () use ($validated, $request, $user, $direction, $recipients, $comment) {
            $document = $this->documentService->uploadDocument(
                $validated,
                $request->file('file'),
                $user
            );

            $document->forceFill([
                'direction' => $direction,
                'status' => 'pending',
            ])->save();

            if ($comment !== '') {
                $document->comments()->create(['user_id' => $user->id, 'body' => $comment]);
            }

            $sentTo = [];

            foreach ($recipients as $block) {
                foreach (User::whereIn('id', $block['user_ids'])->get() as $recipient) {
                    DocumentRecipient::updateOrCreate(
                        ['document_id' => $document->id, 'user_id' => $recipient->id],
                        [
                            'department_id' => $block['department_id'],
                            'sent_by' => $user->id,
                            'priority' => (int) ($recipient->order_num ?? 0),
                            'status' => 'pending',
                        ]
                    );

                    if ($recipient->id !== $user->id) {
                        DocumentAccess::firstOrCreate(
                            ['document_id' => $document->id, 'user_id' => $recipient->id],
                            ['access_level' => 'download']
                        );
                    }

                    $sentTo[] = $recipient->name;
                }
            }

            if ($sentTo) {
                AuditService::log('send', $document, [
                    'direction' => $direction,
                    'sent_to' => $sentTo,
                ], $user);
            }

            return $document;
        });

        return redirect()->route('documents.show', $document->id)->with('success', 'تم حفظ وأرشفة المستند بنجاح (الحالة: قيد الإجراء).');
    }

    public function show(Request $request, Document $document): Response
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        // علّم كمقروء قبل التحميل عشان الحالة تظهر محدّثة
        DocumentRecipient::where('document_id', $document->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->update(['status' => 'read', 'read_at' => now()]);

        $document->load([
            'department',
            'category',
            'uploader',
            'latestVersion.uploader',
            'versions.uploader',
            'comments.user:id,name',
            'recipients' => fn($q) => $q->orderBy('department_id')->orderBy('priority'),
            'recipients.user:id,name',
            'recipients.sender:id,name',
            'recipients.department:id,name',
            'auditLogs' => fn($q) => $q->with('user')->latest('id')->take(20),
        ]);

        $canUserAct = $this->canForward($user, $document);

        $forwardableUsers = $canUserAct
            ? $this->forwardableUsers($user, $document)
            : collect();

        $allDepartments = Department::query()
            ->with(['users' => function ($q) {
                $q->where('status', 'active')
                    ->orderBy('order_num')
                    ->select('id', 'name', 'department_id', 'order_num');
            }])
            ->orderBy('name')
            ->get(['id', 'name']);

        $shareableUsers = $user->isSuperAdmin()
            ? User::where('id', '!=', $user->id)->where('status', 'active')->with('department')
            ->get(['id', 'name', 'email', 'department_id'])
            : collect();

        return Inertia::render('documents/show', [
            'document' => $document,
            'shareableUsers' => $shareableUsers,
            'forwardableUsers' => $forwardableUsers,
            'recipientDepartments' => $allDepartments,
            'userSignatureUrl' => $user->signature_path ? Storage::disk('public')->url($user->signature_path) : null,
            'hasSignature' => !empty($user->signature_path),
            'can' => [
                'update' => $user->can('update', $document),
                'delete' => $user->can('delete', $document),
                'download' => $user->can('download', $document),
                'addVersion' => $user->can('addVersion', $document),
                'share' => $user->can('share', $document),
                'forward' => $canUserAct,
                'sign' => $canUserAct,
                'updateStatus' => $canUserAct,
            ],
        ]);
    }

    public function comment(Request $request, Document $document): RedirectResponse
    {
        Gate::authorize('view', $document);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $document->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim($validated['body']),
        ]);

        return back()->with('success', 'تم إضافة التعليق.');
    }

    /**
     * تحويل المستند بين الأقسام وسلسلة التحويلات
     */
    public function forward(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        abort_unless($this->canForward($user, $document), 403, 'غير مصرح لك بتحويل هذا المستند.');

        $validated = $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'user_ids'      => ['nullable', 'array'],
            'user_ids.*'    => ['integer', 'exists:users,id'],
            'note'          => ['nullable', 'string', 'max:1000'],
        ], [
            'department_id.required' => 'اختر القسم المراد التحويل إليه.',
            'department_id.exists'   => 'القسم المختار غير موجود.',
        ]);

        $targetDept = Department::findOrFail($validated['department_id']);

        $targetsQuery = User::where('department_id', $targetDept->id)->where('status', 'active');
        if (!empty($validated['user_ids'])) {
            $targetsQuery->whereIn('id', $validated['user_ids']);
        }
        $targets = $targetsQuery->get();

        if ($targets->isEmpty()) {
            return back()->withErrors(['department_id' => 'لا يوجد عضوون متاحون في هذا القسم حالياً.']);
        }

        DB::transaction(function () use ($targets, $targetDept, $document, $user, $validated) {
            foreach ($targets as $target) {
                DocumentRecipient::updateOrCreate(
                    ['document_id' => $document->id, 'user_id' => $target->id],
                    [
                        'department_id' => $targetDept->id,
                        'sent_by'       => $user->id,
                        'priority'      => (int) ($target->order_num ?? 0),
                        'status'        => 'pending',
                    ]
                );

                DocumentAccess::firstOrCreate(
                    ['document_id' => $document->id, 'user_id' => $target->id],
                    ['access_level' => 'view']
                );
            }

            // علّم حالة المستلم الحالي كمقروءة لو كانت معلقة
            DocumentRecipient::where('document_id', $document->id)
                ->where('user_id', $user->id)
                ->where('status', 'pending')
                ->update(['status' => 'read', 'read_at' => now()]);

            $note = trim((string) ($validated['note'] ?? ''));
            $names = $targets->pluck('name')->implode('، ');
            $body = "تحويل إلى قسم ({$targetDept->name}) - العضوون: {$names}";
            if ($note !== '') {
                $body .= "\nملاحظات: " . $note;
            }

            $document->comments()->create([
                'user_id' => $user->id,
                'body' => $body,
            ]);

            AuditService::log('forward', $document, [
                'from_department'   => $user->department?->name ?? 'العام',
                'target_department' => $targetDept->name,
                'forwarded_to'      => $targets->pluck('name')->all(),
                'note'              => $note ?: null,
            ], $user);
        });

        return back()->with('success', "تم تحويل المستند إلى قسم ({$targetDept->name}) بنجاح.");
    }

    /**
     * تحديث حالة المستند بين pending و finish
     */
    public function updateStatus(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        abort_unless($this->canForward($user, $document), 403, 'غير مصرح لك بتغيير حالة هذا المستند.');

        $validated = $request->validate([
            'status' => ['required', 'in:pending,finish'],
        ]);

        $oldStatus = $document->status;
        $newStatus = $validated['status'];

        $document->update(['status' => $newStatus]);

        $statusArabic = $newStatus === 'finish' ? 'مكتمل (Finish)' : 'قيد الإجراء (Pending)';

        $document->comments()->create([
            'user_id' => $user->id,
            'body' => "تم تغيير حالة المعاملة إلى: {$statusArabic}",
        ]);

        AuditService::log('update_status', $document, [
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ], $user);

        return back()->with('success', "تم تحديث حالة المستند إلى \"{$statusArabic}\" بنجاح.");
    }

    /**
     * توقيع المستند إلكترونياً وحفظه كإصدار جديد معتمد
     */
    public function sign(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        abort_unless($this->canForward($user, $document), 403, 'غير مصرح لك بتوقيع هذا المستند.');

        $validated = $request->validate([
            'file'           => ['required', 'file', 'max:51200'],
            'mark_as_finish' => ['nullable', 'boolean'],
            'note'           => ['nullable', 'string', 'max:1000'],
        ]);

        $file = $request->file('file');
        $nextVersionNo = ((int) $document->versions()->max('version_no')) + 1;

        $path = $file->store('documents', 'local');
        $fileHash = hash_file('sha256', $file->getRealPath());

        $note = trim((string) ($validated['note'] ?? ''));
        $versionNotes = "نسخة معتمدة وموقعة إلكترونياً بواسطة: {$user->name}";
        if ($note !== '') {
            $versionNotes .= " - {$note}";
        }

        DB::transaction(function () use ($document, $nextVersionNo, $path, $file, $fileHash, $versionNotes, $user, $request, $note) {
            $document->versions()->create([
                'version_no'    => $nextVersionNo,
                'file_path'     => $path,
                'original_name' => $file->getClientOriginalName(),
                'file_size'     => $file->getSize(),
                'mime_type'     => $file->getClientMimeType() ?: 'application/octet-stream',
                'file_hash'     => $fileHash,
                'change_notes'  => $versionNotes,
                'uploaded_by'   => $user->id,
            ]);

            if ($request->boolean('mark_as_finish')) {
                $document->update(['status' => 'finish']);
            }

            // تحديث حالة القراءة للمستخدم الحالي
            DocumentRecipient::where('document_id', $document->id)
                ->where('user_id', $user->id)
                ->update(['status' => 'read', 'read_at' => now()]);

            $commentText = "قام {$user->name} بتوقيع واعتماد المستند إلكترونياً (الإصدار v{$nextVersionNo})";
            if ($request->boolean('mark_as_finish')) {
                $commentText .= " وتم إنهاء المعاملة وحفظها كمكتملة.";
            }
            if ($note !== '') {
                $commentText .= "\nملاحظات: " . $note;
            }

            $document->comments()->create([
                'user_id' => $user->id,
                'body' => $commentText,
            ]);

            AuditService::log('sign', $document, [
                'version'   => $nextVersionNo,
                'signed_by' => $user->name,
                'status'    => $document->status,
                'note'      => $note ?: null,
            ], $user);
        });

        return redirect()->route('documents.show', $document->id)
            ->with('success', "تم توقيع وحفظ المستند بنجاح كإصدار جديد معتمد (v{$nextVersionNo}).");
    }

    public function update(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('update', $document);

        $validated = $request->validate([
            'title'        => ['required', 'string', 'max:255'],
            'reference_no' => ['required', 'string', 'max:100', 'unique:documents,reference_no,' . $document->id],
            'doc_date'     => ['required', 'date'],
            'direction'    => ['nullable', 'in:incoming,outgoing'],
            'category_id'  => ['required', 'exists:categories,id'],
            'status'       => ['required', 'in:active,archived,draft,pending,finish'],
        ]);

        $document->update([
            'title'        => $validated['title'],
            'reference_no' => $validated['reference_no'],
            'doc_date'     => $validated['doc_date'],
            'direction'    => $validated['direction'] ?? $document->direction,
            'category_id'  => $validated['category_id'],
            'status'       => $validated['status'],
        ]);

        AuditService::log('edit_metadata', $document, [
            'title'        => $document->title,
            'reference_no' => $document->reference_no,
            'status'       => $document->status,
        ], $user);

        return back()->with('success', 'تم تحديث بيانات المستند بنجاح.');
    }

    public function destroy(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('delete', $document);

        AuditService::log('delete', $document, [
            'title'        => $document->title,
            'reference_no' => $document->reference_no,
        ], $user);

        $document->delete();

        return redirect()->route('documents.index')->with('success', 'تم نقل المستند إلى سلة المحذوفات.');
    }
}
