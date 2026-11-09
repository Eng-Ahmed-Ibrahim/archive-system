<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentRecipient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $stats = [
            'total' => Document::accessibleBy($user)->count(),
            'incoming' => Document::accessibleBy($user)->where('direction', 'incoming')->count(),
            'outgoing' => Document::accessibleBy($user)->where('direction', 'outgoing')->count(),
            'today' => Document::accessibleBy($user)->whereDate('created_at', today())->count(),
            'unread' => DocumentRecipient::where('user_id', $user->id)
                ->where('status', 'pending')
                ->whereHas('document')
                ->count(),
        ];

        // وارد/صادر لكل قسم، من المستندات اللي المستخدم يقدر يشوفها فقط
        $rows = Document::accessibleBy($user)
            ->selectRaw('department_id, direction, COUNT(*) as total')
            ->groupBy('department_id', 'direction')
            ->get()
            ->groupBy('department_id');

        $departments = Department::whereIn('id', $rows->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'code' => $d->code,
                'incoming' => (int) optional($rows[$d->id]->firstWhere('direction', 'incoming'))->total,
                'outgoing' => (int) optional($rows[$d->id]->firstWhere('direction', 'outgoing'))->total,
            ])
            ->values();

        $recentDocuments = Document::accessibleBy($user)
            ->with(['department', 'category', 'type', 'latestVersion', 'tags'])
            ->latest('id')
            ->take(8)
            ->get();

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'departments' => $departments,
            'recentDocuments' => $recentDocuments,
        ]);
    }
}