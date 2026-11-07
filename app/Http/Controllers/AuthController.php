<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * Show login page with list of demo accounts for quick testing
     */
    public function showLogin(): Response
    {
        $demoUsers = User::with(['department', 'roles'])->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'department' => $u->department?->name ?? 'الإدارة ',
                'role' => $u->roles->first()?->display_name ?? 'مستخدم',
            ];
        });

        return Inertia::render('auth/login', [
            'demoUsers' => $demoUsers,
        ]);
    }

    /**
     * Handle regular login
     */
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            AuditService::log('login', null, [
                'email' => $request->email,
            ]);

            return redirect()->intended(route('dashboard'));
        }

        throw ValidationException::withMessages([
            'email' => __('بيانات الدخول غير صحيحة.'),
        ]);
    }

    /**
     * Quick demo login switch
     */
    public function demoLogin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        $user = User::findOrFail($validated['user_id']);
        Auth::login($user);
        $request->session()->regenerate();

        AuditService::log('demo_login', null, [
            'switched_to' => $user->email,
        ]);

        return redirect()->route('dashboard');
    }

    /**
     * Handle logout
     */
    public function logout(Request $request): RedirectResponse
    {
        AuditService::log('logout');

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
