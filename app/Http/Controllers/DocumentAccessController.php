<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentAccess;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DocumentAccessController extends Controller
{
    /**
     * Share document with a specific user
     */
    public function store(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('share', $document);

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'access_level' => ['required', 'in:view,download,edit'],
        ]);

        $recipient = User::findOrFail($validated['user_id']);

        $access = DocumentAccess::updateOrCreate(
            ['document_id' => $document->id, 'user_id' => $recipient->id],
            ['access_level' => $validated['access_level']]
        );

        AuditService::log('share', $document, [
            'shared_with' => $recipient->name,
            'shared_with_email' => $recipient->email,
            'access_level' => $validated['access_level'],
        ], $user);

        return back()->with('success', "تم مشاركة المستند مع {$recipient->name} بنجاح.");
    }

    /**
     * Revoke document access for a user
     */
    public function destroy(Request $request, Document $document, DocumentAccess $access): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('share', $document);

        if ((int) $access->document_id !== (int) $document->id) {
            abort(404);
        }

        $recipientName = $access->user?->name;

        AuditService::log('revoke_share', $document, [
            'revoked_from' => $recipientName,
        ], $user);

        $access->delete();

        return back()->with('success', "تم إلغاء مشاركة المستند مع {$recipientName}.");
    }
}
