<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $userData = null;
        if ($user) {
            $user->loadMissing(['department', 'roles.permissions']);
            $permissions = $user->isSuperAdmin()
                ? ['*']
                : $user->roles->flatMap->permissions->pluck('name')->unique()->values()->all();

            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department_id' => $user->department_id,
                'department' => $user->department?->name ?? 'الإدارة ',
                'roles' => $user->roles->pluck('name'),
                'role_names' => $user->roles->pluck('display_name'),
                'is_admin' => $user->isSuperAdmin(),
                'permissions' => $permissions,
            ];
        }

        return [
            ...parent::share($request),
            'appName' => 'سيستم الأرشيف ',
            'auth' => [
                'user' => $userData,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'demoUsers' => User::with(['department', 'roles'])->get()->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'department' => $u->department?->name ?? 'الإدارة ',
                    'role' => $u->roles->first()?->display_name ?? 'مستخدم',
                ];
            }),
        ];
    }
}
