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
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    /**
     * المستخدم العادي يحوّل بس لموظفين نفس قسمه ورقمهم أكبر من رقمه (أقل رتبة).
     * السوبر أدمن يحوّل لأي موظف نشط. الموجودين كمستلمين أصلاً مستبعدين.
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

            $query->where('department_id', $user->department_id)
                ->where('order_num', '>', (int) $user->order_num);
        }

        return $query->with('department:id,name')
            ->orderBy('department_id')
            ->orderBy('order_num')
            ->get(['id', 'name', 'department_id', 'order_num']);
    }

    /** مين يقدر يحوّل: السوبر أدمن أو واحد من المستلمين */
    private function canForward(User $user, Document $document): bool
    {
        return $user->isSuperAdmin()
            || $document->recipients()->where('user_id', $user->id)->exists();
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
            'filters' => $request->only(['search', 'department_id', 'category_id', 'direction', 'unread', 'date_from', 'date_to']),
            'counts' => [
                'incoming' => Document::accessibleBy($user)->where('direction', 'incoming')->count(),
                'outgoing' => Document::accessibleBy($user)->where('direction', 'outgoing')->count(),
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
            'subjects' => $subjects, // <-- تمرير المواضيع للواجهة
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
                // التحقق من أن الموضوع يتبع للقسم المُختار تماماً لمنع أي تلاعب
                function ($attribute, $value, $fail) use ($request) {
                    $exists = \App\Models\Subject::where('id', $value)
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
            'recipients.*.user_ids.required' => 'اختر موظفاً واحداً على الأقل في كل قسم.',
            'recipients.*.user_ids.min' => 'اختر موظفاً واحداً على الأقل في كل قسم.',
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
                    "recipients.{$i}.user_ids" => 'يوجد موظف غير تابع للقسم المختار أو غير نشط.',
                ])->withInput();
            }
        }

        if (!$user->isSuperAdmin() && $user->department_id) {
            $validated['department_id'] = $user->department_id;
        }

        // قيم افتراضية لأن الفورم مبقاش يبعتها (الـ Service ممكن يعتمد عليها)
        $validated += [
            'type_id' => null,
            'status' => 'active',
            'tags' => [],
            'change_notes' => 'النسخة الأصلية الأولى',
        ];

        $document = DB::transaction(function () use ($validated, $request, $user, $direction, $recipients, $comment) {
            $document = $this->documentService->uploadDocument(
                $validated,
                $request->file('file'),
                $user
            );

            $document->forceFill(['direction' => $direction])->save();

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
                            'priority' => (int) $recipient->order_num,
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

        return redirect()->route('documents.show', $document->id)->with('success', 'تم حفظ وأرشفة المستند بنجاح.');
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

        $forwardableUsers = $this->canForward($user, $document)
            ? $this->forwardableUsers($user, $document)
            : collect();

        $shareableUsers = $user->isSuperAdmin()
            ? User::where('id', '!=', $user->id)->where('status', 'active')->with('department')
            ->get(['id', 'name', 'email', 'department_id'])
            : collect();

        return Inertia::render('documents/show', [
            'document' => $document,
            'shareableUsers' => $shareableUsers,
            'forwardableUsers' => $forwardableUsers,
            'can' => [
                'update' => $user->can('update', $document),
                'delete' => $user->can('delete', $document),
                'download' => $user->can('download', $document),
                'addVersion' => $user->can('addVersion', $document),
                'share' => $user->can('share', $document),
                'forward' => $forwardableUsers->isNotEmpty(),
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

    public function forward(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        abort_unless($this->canForward($user, $document), 403, 'غير مصرح لك بتحويل هذا المستند.');

        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'distinct'],
            'note' => ['nullable', 'string', 'max:1000'],
        ], [
            'user_ids.required' => 'اختر موظفاً واحداً على الأقل.',
            'user_ids.min' => 'اختر موظفاً واحداً على الأقل.',
        ]);

        $allowed = $this->forwardableUsers($user, $document)->keyBy('id');

        foreach ($validated['user_ids'] as $id) {
            if (!$allowed->has((int) $id)) {
                return back()->withErrors([
                    'user_ids' => 'لا يمكنك التحويل إلا لموظفين أقل منك في الترتيب داخل قسمك.',
                ]);
            }
        }

        $targets = collect($validated['user_ids'])->map(fn($id) => $allowed[(int) $id]);

        DB::transaction(function () use ($targets, $document, $user, $validated) {
            foreach ($targets as $target) {
                DocumentRecipient::create([
                    'document_id' => $document->id,
                    'user_id' => $target->id,
                    'department_id' => $target->department_id,
                    'sent_by' => $user->id,
                    'priority' => (int) $target->order_num,
                    'status' => 'pending',
                ]);

                // صلاحية مشاهدة فقط
                DocumentAccess::firstOrCreate(
                    ['document_id' => $document->id, 'user_id' => $target->id],
                    ['access_level' => 'view']
                );
            }

            $note = trim((string) ($validated['note'] ?? ''));
            if ($note !== '') {
                $document->comments()->create([
                    'user_id' => $user->id,
                    'body' => 'تحويل إلى ' . $targets->pluck('name')->implode('، ') . ': ' . $note,
                ]);
            }

            AuditService::log('forward', $document, [
                'forwarded_to' => $targets->pluck('name')->all(),
            ], $user);
        });

        return back()->with('success', 'تم تحويل المستند بنجاح.');
    }

    public function update(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('update', $document);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'reference_no' => ['required', 'string', 'max:100', 'unique:documents,reference_no,' . $document->id],
            'doc_date' => ['required', 'date'],
            'direction' => ['nullable', 'in:incoming,outgoing'],
            'category_id' => ['required', 'exists:categories,id'],
            'status' => ['required', 'in:active,archived,draft'],
        ]);

        $document->update([
            'title' => $validated['title'],
            'reference_no' => $validated['reference_no'],
            'doc_date' => $validated['doc_date'],
            'direction' => $validated['direction'] ?? $document->direction,
            'category_id' => $validated['category_id'],
            'status' => $validated['status'],
        ]);

        AuditService::log('edit_metadata', $document, [
            'title' => $document->title,
            'reference_no' => $document->reference_no,
        ], $user);

        return back()->with('success', 'تم تحديث بيانات المستند بنجاح.');
    }

    public function destroy(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('delete', $document);

        AuditService::log('delete', $document, [
            'title' => $document->title,
            'reference_no' => $document->reference_no,
        ], $user);

        $document->delete();

        return redirect()->route('documents.index')->with('success', 'تم نقل المستند إلى سلة المحذوفات.');
    }
}
