<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an action into the audit trail
     */
    public static function log(
        string $action,
        ?Document $document = null,
        ?array $details = null,
        ?User $user = null
    ): AuditLog {
        $currentUser = $user ?? Auth::user();

        return AuditLog::create([
            'user_id' => $currentUser?->id,
            'document_id' => $document?->id,
            'action' => $action,
            'ip_address' => Request::ip() ?? '127.0.0.1',
            'user_agent' => Request::userAgent() ?? 'System',
            'details' => $details,
            'created_at' => now(),
        ]);
    }
}
