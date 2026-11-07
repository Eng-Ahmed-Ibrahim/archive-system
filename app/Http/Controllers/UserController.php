<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): Response
    {
        $currentUser = $request->user();

        if (!$currentUser->isSuperAdmin() && !$currentUser->hasPermission('users.manage')) {
            abort(403, 'غير مصرح لك بإدارة المستخدمين.');
        }

        $query = User::with(['department', 'roles'])->withCount('uploadedDocuments');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($deptId = $request->input('department_id')) {
            $query->where('department_id', $deptId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->latest('id')->paginate(15)->withQueryString();

        $departments = Department::all(['id', 'name']);
        $roles = Role::all(['id', 'name', 'display_name']);

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => $request->only(['search', 'department_id', 'status']),
            'departments' => $departments,
            'roles' => $roles,
        ]);
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request): RedirectResponse
    {
        $currentUser = $request->user();

        if (!$currentUser->isSuperAdmin() && !$currentUser->hasPermission('users.manage')) {
            abort(403, 'غير مصرح لك بإضافة مستخدمين.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'department_id' => !empty($validated['department_id']) ? $validated['department_id'] : null,
            'status' => $validated['status'],
        ]);

        $user->roles()->sync([$validated['role_id']]);

        AuditService::log('create_user', null, [
            'created_user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'department_id' => $user->department_id,
        ], $currentUser);

        return back()->with('success', "تم إنشاء حساب المستخدم \"{$user->name}\" بنجاح.");
    }

    /**
     * Update an existing user
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $currentUser = $request->user();

        if (!$currentUser->isSuperAdmin() && !$currentUser->hasPermission('users.manage')) {
            abort(403, 'غير مصرح لك بتعديل المستخدمين.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'min:6'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'department_id' => !empty($validated['department_id']) ? $validated['department_id'] : null,
            'status' => $validated['status'],
        ];

        if (!empty($validated['password'])) {
            $userData['password'] = Hash::make($validated['password']);
        }

        $user->update($userData);
        $user->roles()->sync([$validated['role_id']]);

        AuditService::log('update_user', null, [
            'updated_user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
        ], $currentUser);

        return back()->with('success', "تم تحديث بيانات المستخدم \"{$user->name}\" بنجاح.");
    }

    /**
     * Delete a user
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $currentUser = $request->user();

        if (!$currentUser->isSuperAdmin() && !$currentUser->hasPermission('users.manage')) {
            abort(403, 'غير مصرح لك بحذف المستخدمين.');
        }

        if ((int) $user->id === (int) $currentUser->id) {
            return back()->with('error', 'لا يمكنك حذف حسابك الشخصي المسجل به حالياً.');
        }

        $name = $user->name;

        AuditService::log('delete_user', null, [
            'deleted_user_id' => $user->id,
            'name' => $name,
            'email' => $user->email,
        ], $currentUser);

        $user->roles()->detach();
        $user->delete();

        return back()->with('success', "تم حذف المستخدم \"{$name}\" بنجاح.");
    }
}
