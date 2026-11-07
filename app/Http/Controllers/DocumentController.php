<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Tag;
use App\Models\User;
use App\Services\AuditService;
use App\Services\DocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    /**
     * Display a listing of documents with comprehensive search and filters
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Document::accessibleBy($user)
            ->with(['department', 'category', 'type', 'latestVersion', 'tags']);

        // Search query
        if ($search = $request->input('search')) {
            $query->search($search);
        }

        // Filters
        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }

        if ($catId = $request->input('category_id')) {
            $query->where('category_id', $catId);
        }

        if ($typeId = $request->input('type_id')) {
            $query->where('type_id', $typeId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('doc_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('doc_date', '<=', $dateTo);
        }

        if ($tag = $request->input('tag')) {
            $query->whereHas('tags', function ($q) use ($tag) {
                $q->where('name', $tag);
            });
        }

        $documents = $query->latest('id')->paginate(12)->withQueryString();

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'department_id', 'category_id', 'type_id', 'status', 'date_from', 'date_to', 'tag']),
            'departments' => Department::all(['id', 'name']),
            'categories' => Category::all(['id', 'name', 'parent_id', 'department_id']),
            'documentTypes' => DocumentType::all(['id', 'name']),
            'tags' => Tag::all(['id', 'name']),
        ]);
    }

    /**
     * Show form for creating a new document
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        Gate::authorize('create', Document::class);

        // Departments accessible by user
        $departments = $user->isSuperAdmin()
            ? Department::all()
            : Department::where('id', $user->department_id)->get();

        $categories = Category::query();
        if (!$user->isSuperAdmin() && $user->department_id) {
            $categories->where(function ($q) use ($user) {
                $q->whereNull('department_id')->orWhere('department_id', $user->department_id);
            });
        }

        return Inertia::render('documents/create', [
            'departments' => $departments,
            'categories' => $categories->get(),
            'documentTypes' => DocumentType::all(),
            'allTags' => Tag::pluck('name'),
            'defaultDepartmentId' => $user->department_id,
        ]);
    }

    /**
     * Store newly uploaded document
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('create', Document::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'reference_no' => ['nullable', 'string', 'max:100', 'unique:documents,reference_no'],
            'doc_date' => ['required', 'date'],
            'department_id' => ['required', 'exists:departments,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'type_id' => ['nullable', 'exists:document_types,id'],
            'status' => ['nullable', 'in:active,archived,draft'],
            'tags' => ['nullable'],
            'file' => ['required', 'file', 'max:51200'], // 50MB max
            'change_notes' => ['nullable', 'string', 'max:500'],
        ]);

        // If not super admin, restrict department to user's department
        if (!$user->isSuperAdmin() && $user->department_id) {
            $validated['department_id'] = $user->department_id;
        }

        $document = $this->documentService->uploadDocument(
            $validated,
            $request->file('file'),
            $user
        );

        return redirect()->route('documents.show', $document->id)->with('success', 'تم حفظ وأرشفة المستند بنجاح.');
    }

    /**
     * Display a specific document with preview, metadata, versions, and audit logs
     */
    public function show(Request $request, Document $document): Response
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        $document->load([
            'department',
            'category',
            'type',
            'uploader',
            'latestVersion.uploader',
            'versions.uploader',
            'tags',
            'accessList.user',
            'auditLogs' => function ($q) {
                $q->with('user')->latest('id')->take(20);
            },
        ]);

        // List users for sharing
        $shareableUsers = User::where('id', '!=', $user->id)
            ->where('status', 'active')
            ->with('department')
            ->get(['id', 'name', 'email', 'department_id']);

        return Inertia::render('documents/show', [
            'document' => $document,
            'shareableUsers' => $shareableUsers,
            'can' => [
                'update' => $user->can('update', $document),
                'delete' => $user->can('delete', $document),
                'download' => $user->can('download', $document),
                'addVersion' => $user->can('addVersion', $document),
                'share' => $user->can('share', $document),
            ],
        ]);
    }

    /**
     * Update document metadata
     */
    public function update(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('update', $document);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'reference_no' => ['required', 'string', 'max:100', 'unique:documents,reference_no,' . $document->id],
            'doc_date' => ['required', 'date'],
            'type_id' => ['nullable', 'exists:document_types,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'status' => ['required', 'in:active,archived,draft'],
            'tags' => ['nullable'],
        ]);

        $document->update([
            'title' => $validated['title'],
            'reference_no' => $validated['reference_no'],
            'doc_date' => $validated['doc_date'],
            'type_id' => $validated['type_id'],
            'category_id' => $validated['category_id'],
            'status' => $validated['status'],
        ]);

        // Sync tags
        if (isset($validated['tags'])) {
            $tagNames = is_array($validated['tags'])
                ? $validated['tags']
                : array_filter(array_map('trim', explode(',', $validated['tags'])));

            $tagIds = [];
            foreach ($tagNames as $name) {
                if ($name) {
                    $tag = Tag::firstOrCreate(['name' => $name]);
                    $tagIds[] = $tag->id;
                }
            }
            $document->tags()->sync($tagIds);
        }

        AuditService::log('edit_metadata', $document, [
            'title' => $document->title,
            'reference_no' => $document->reference_no,
        ], $user);

        return back()->with('success', 'تم تحديث بيانات المستند بنجاح.');
    }

    /**
     * Soft delete document
     */
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
