<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Document;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    /**
     * Display listing of departments
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $departments = Department::withCount(['documents', 'categories', 'users'])
            ->get()
            ->map(function ($dept) use ($user) {
                $dept->can_access = $user->isSuperAdmin() || (int) $user->department_id === (int) $dept->id;
                return $dept;
            });

        return Inertia::render('departments/index', [
            'departments' => $departments,
            'canManage' => $user->isSuperAdmin() || $user->hasPermission('departments.manage'),
        ]);
    }

    /**
     * Store a newly created department
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('departments.manage')) {
            abort(403, 'غير مصرح لك بإضافة أقسام جديدة.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:departments,code'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $department = Department::create($validated);

        AuditService::log('create_department', null, [
            'department_id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
        ], $user);

        return back()->with('success', "تم إنشاء القسم \"{$department->name}\" بنجاح.");
    }

    /**
     * Update an existing department
     */
    public function update(Request $request, Department $department): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('departments.manage')) {
            abort(403, 'غير مصرح لك بتعديل الأقسام.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:departments,code,' . $department->id],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $department->update($validated);

        AuditService::log('update_department', null, [
            'department_id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
        ], $user);

        return back()->with('success', "تم تحديث بيانات القسم \"{$department->name}\" بنجاح.");
    }

    /**
     * Delete a department if empty
     */
    public function destroy(Request $request, Department $department): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('departments.manage')) {
            abort(403, 'غير مصرح لك بحذف الأقسام.');
        }

        if ($department->documents()->exists()) {
            return back()->with('error', "لا يمكن حذف قسم \"{$department->name}\" لوجود مستندات مرتبطة به.");
        }

        if ($department->users()->exists()) {
            return back()->with('error', "لا يمكن حذف قسم \"{$department->name}\" لوجود موظفين مسجلين عليه.");
        }

        $name = $department->name;

        AuditService::log('delete_department', null, [
            'department_id' => $department->id,
            'name' => $name,
        ], $user);

        $department->delete();

        return back()->with('success', "تم حذف القسم \"{$name}\" بنجاح.");
    }
}
