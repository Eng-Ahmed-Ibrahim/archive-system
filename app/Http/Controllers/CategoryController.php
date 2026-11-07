<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Department;
use App\Models\Document;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Folder explorer view with department filtering, category tree, breadcrumbs and direct/nested documents
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedCategoryId = $request->query('category_id');
        $departmentId = $request->query('department_id');
        $includeSubfolders = $request->boolean('include_subfolders', false);

        // Department query
        $currentDepartment = null;
        if ($departmentId) {
            $currentDepartment = Department::find($departmentId);
        }

        // Fetch categories query based on user's department isolation & selected department
        $catQuery = Category::query();
        if (!$user->isSuperAdmin() && $user->department_id) {
            $catQuery->where(function ($q) use ($user) {
                $q->whereNull('department_id')
                  ->orWhere('department_id', $user->department_id);
            });
        }

        if ($departmentId) {
            $catQuery->where(function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        // Get all categories matching filter
        $allCategories = $catQuery->withCount('documents')->with('department')->get();

        // Selected category
        $selectedCategory = $selectedCategoryId
            ? Category::with(['department', 'parent'])->find($selectedCategoryId)
            : $allCategories->firstWhere('parent_id', null);

        // Build breadcrumbs path for Windows Explorer style navigation
        $breadcrumbs = [];
        if ($selectedCategory) {
            $curr = $selectedCategory;
            while ($curr) {
                array_unshift($breadcrumbs, [
                    'id' => $curr->id,
                    'name' => $curr->name,
                ]);
                $curr = $curr->parent;
            }
        }

        // Direct subfolders in current folder
        $subfolders = collect();
        if ($selectedCategory) {
            $subfolders = Category::where('parent_id', $selectedCategory->id)
                ->withCount('documents')
                ->get();
        } else if ($departmentId) {
            $subfolders = Category::where('department_id', $departmentId)
                ->whereNull('parent_id')
                ->withCount('documents')
                ->get();
        }

        // Documents in selected category
        $documents = collect();
        if ($selectedCategory) {
            $categoryIds = [$selectedCategory->id];

            if ($includeSubfolders) {
                $categoryIds = array_merge($categoryIds, $selectedCategory->getAllDescendantIds());
            }

            $documents = Document::accessibleBy($user)
                ->whereIn('category_id', $categoryIds)
                ->with(['department', 'category', 'type', 'latestVersion', 'tags'])
                ->latest()
                ->paginate(15)
                ->withQueryString();
        }

        $departments = Department::all(['id', 'name', 'code']);

        return Inertia::render('categories/index', [
            'categories' => $allCategories,
            'selectedCategory' => $selectedCategory,
            'currentDepartment' => $currentDepartment,
            'subfolders' => $subfolders,
            'breadcrumbs' => $breadcrumbs,
            'includeSubfolders' => $includeSubfolders,
            'documents' => $documents,
            'departments' => $departments,
            'canManage' => $user->isSuperAdmin() || $user->hasPermission('categories.manage'),
        ]);
    }

    /**
     * Create a new category / folder
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('categories.manage')) {
            abort(403, 'ليس لديك صلاحية إنشاء مجلدات.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        // If parent has a department_id and not specified, inherit it
        if (!empty($validated['parent_id']) && empty($validated['department_id'])) {
            $parent = Category::find($validated['parent_id']);
            if ($parent?->department_id) {
                $validated['department_id'] = $parent->department_id;
            }
        }

        // If user is restricted to a department, enforce department_id
        if (!$user->isSuperAdmin() && $user->department_id) {
            $validated['department_id'] = $user->department_id;
        }

        $category = Category::create($validated);

        AuditService::log('create_category', null, [
            'category_id' => $category->id,
            'name' => $category->name,
            'parent_id' => $category->parent_id,
            'department_id' => $category->department_id,
        ], $user);

        return back()->with('success', "تم إنشاء المجلد \"{$category->name}\" بنجاح.");
    }

    /**
     * Update an existing category
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('categories.manage')) {
            abort(403, 'ليس لديك صلاحية تعديل المجلدات.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id', 'different:category.id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $category->update($validated);

        AuditService::log('update_category', null, [
            'category_id' => $category->id,
            'name' => $category->name,
            'department_id' => $category->department_id,
        ], $user);

        return back()->with('success', "تم تحديث بيانات المجلد \"{$category->name}\" بنجاح.");
    }

    /**
     * Delete a category
     */
    public function destroy(Request $request, Category $category): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('categories.manage')) {
            abort(403, 'ليس لديك صلاحية حذف المجلدات.');
        }

        if ($category->documents()->exists()) {
            return back()->with('error', "لا يمكن حذف المجلد \"{$category->name}\" لأنه يحتوي على مستندات.");
        }

        if ($category->children()->exists()) {
            return back()->with('error', "لا يمكن حذف المجلد \"{$category->name}\" لأنه يحتوي على مجلدات فرعية.");
        }

        $name = $category->name;

        AuditService::log('delete_category', null, [
            'category_id' => $category->id,
            'name' => $name,
        ], $user);

        $category->delete();

        return redirect()->route('categories.index')->with('success', "تم حذف المجلد \"{$name}\" بنجاح.");
    }
}
