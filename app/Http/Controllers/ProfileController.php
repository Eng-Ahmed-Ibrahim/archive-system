<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile and signature management page.
     */
    public function edit(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing(['department', 'roles']);

        return Inertia::render('profile/index', [
            'profileUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->department?->name ?? 'الإدارة العامة',
                'department_id' => $user->department_id,
                'roles' => $user->roles->pluck('display_name'),
                'order_num' => $user->order_num,
                'has_signature' => !empty($user->signature_path),
                'signature_url' => $user->signature_path ? Storage::disk('public')->url($user->signature_path) : null,
            ],
        ]);
    }

    /**
     * Update or upload the user's signature.
     */
    public function updateSignature(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $request->validate([
            'signature' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
            'signature_base64' => ['nullable', 'string'],
        ]);

        $newPath = null;

        if ($request->hasFile('signature')) {
            $newPath = $request->file('signature')->store('signatures', 'public');
        } elseif ($request->filled('signature_base64')) {
            $base64 = (string) $request->input('signature_base64');
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $matches)) {
                $ext = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
                $data = substr($base64, strpos($base64, ',') + 1);
                $decoded = base64_decode($data);

                if ($decoded !== false) {
                    $filename = 'signatures/sig_' . $user->id . '_' . Str::random(10) . '.' . $ext;
                    Storage::disk('public')->put($filename, $decoded);
                    $newPath = $filename;
                }
            }
        }

        if (!$newPath) {
            return back()->withErrors(['signature' => 'يرجى رسم التوقيع أو رفع ملف صورة التوقيع.']);
        }

        // Delete old signature if it exists
        if ($user->signature_path && Storage::disk('public')->exists($user->signature_path)) {
            Storage::disk('public')->delete($user->signature_path);
        }

        $user->update([
            'signature_path' => $newPath,
        ]);

        AuditService::log('update_signature', null, [
            'user_id' => $user->id,
            'name' => $user->name,
        ], $user);

        return back()->with('success', 'تم حفظ التوقيع الإلكتروني بنجاح.');
    }

    /**
     * Delete the user's current signature.
     */
    public function destroySignature(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->signature_path) {
            if (Storage::disk('public')->exists($user->signature_path)) {
                Storage::disk('public')->delete($user->signature_path);
            }
            $user->update(['signature_path' => null]);

            AuditService::log('delete_signature', null, [
                'user_id' => $user->id,
                'name' => $user->name,
            ], $user);
        }

        return back()->with('success', 'تم حذف التوقيع الإلكتروني بنجاح.');
    }
}
