<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display a listing of audit logs
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if (!$user->isSuperAdmin() && !$user->hasPermission('audit.view')) {
            abort(403, 'غير مصرح لك بالاطلاع على سجل الرقابة.');
        }

        $query = AuditLog::with(['user', 'document']);

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $logs = $query->latest('id')->paginate(20)->withQueryString();

        $actions = [
            'login' => 'تسجيل دخول',
            'logout' => 'تسجيل خروج',
            'demo_login' => 'تبديل حساب تجريبي',
            'upload' => 'رفع ملف جديد',
            'view' => 'معاينة مستند',
            'download' => 'تحميل مستند',
            'new_version' => 'رفع إصدار جديد',
            'edit_metadata' => 'تعديل بيانات المستند',
            'delete' => 'حذف مستند',
            'share' => 'مشاركة مستند',
            'revoke_share' => 'إلغاء مشاركة مستند',
            'create_category' => 'إنشاء مجلد',
            'update_category' => 'تعديل مجلد',
            'delete_category' => 'حذف مجلد',
        ];

        return Inertia::render('audit/index', [
            'logs' => $logs,
            'filters' => $request->only(['action', 'user_id', 'date_from', 'date_to']),
            'users' => User::all(['id', 'name']),
            'availableActions' => $actions,
        ]);
    }
}
