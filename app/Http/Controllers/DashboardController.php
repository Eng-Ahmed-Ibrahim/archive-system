<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Documents accessible to this user
        $docQuery = Document::accessibleBy($user);

        $totalDocuments = (clone $docQuery)->count();
        $todayDocuments = (clone $docQuery)->whereDate('created_at', today())->count();

        // Calculate storage used for accessible documents
        $docIds = (clone $docQuery)->pluck('id');
        $totalBytes = DocumentVersion::whereIn('document_id', $docIds)->sum('file_size');

        $storageFormatted = $this->formatBytes($totalBytes);

        // Recent documents
        $recentDocuments = (clone $docQuery)
            ->with(['department', 'category', 'type', 'latestVersion'])
            ->latest()
            ->take(6)
            ->get();

        // Recent audit activities (for admin all, for others only their department/actions)
        $auditQuery = AuditLog::with(['user', 'document']);
        if (!$user->isSuperAdmin()) {
            $auditQuery->where(function ($q) use ($user, $docIds) {
                $q->where('user_id', $user->id)
                  ->orWhereIn('document_id', $docIds);
            });
        }
        $recentActivities = $auditQuery->latest('id')->take(8)->get();

        // Department breakdown
        $departments = Department::withCount('documents')->get();

        return Inertia::render('dashboard', [
            'stats' => [
                'totalDocuments' => $totalDocuments,
                'todayDocuments' => $todayDocuments,
                'totalDepartments' => $departments->count(),
                'storageFormatted' => $storageFormatted,
                'storageBytes' => $totalBytes,
            ],
            'recentDocuments' => $recentDocuments,
            'recentActivities' => $recentActivities,
            'departments' => $departments,
        ]);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
