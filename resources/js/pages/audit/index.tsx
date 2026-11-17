import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Calendar,
    Eye,
    FileText,
    Filter,
    History,
    RefreshCw,
    Shield,
    UserCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import AppLayout from '../../layouts/AppLayout';
import type { AuditLog, PaginatedData, User } from '../../types';

interface Props {
    logs: PaginatedData<AuditLog>;
    filters: {
        action?: string;
        user_id?: string;
        date_from?: string;
        date_to?: string;
    };
    users: User[];
    availableActions: Record<string, string>;
}

export default function AuditIndex({ logs, filters, users, availableActions }: Props) {
    const [action, setAction] = useState(filters.action || '');
    const [userId, setUserId] = useState(filters.user_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get('/audit-logs', {
            action: action || undefined,
            user_id: userId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setAction('');
        setUserId('');
        setDateFrom('');
        setDateTo('');
        router.get('/audit-logs');
    };

    const getActionBadge = (act: string) => {
        const actionColors: Record<string, string> = {
            upload: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            view: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            download: 'bg-blue-50 text-blue-700 border-blue-200',
            new_version: 'bg-purple-50 text-purple-700 border-purple-200',
            edit_metadata: 'bg-amber-50 text-amber-700 border-amber-200',
            delete: 'bg-rose-50 text-rose-700 border-rose-200',
            share: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            revoke_share: 'bg-rose-50 text-rose-800 border-rose-200',
            login: 'bg-slate-100 text-slate-700 border-slate-200',
            demo_login: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };

        const color = actionColors[act] || 'bg-slate-100 text-slate-700 border-slate-200';
        const label = availableActions[act] || act;

        return (
            <span className={`text-[10px] px-2.5 py-1 rounded-full border ${color} font-semibold shadow-2xs inline-block`}>
                {label}
            </span>
        );
    };

    return (
        <AppLayout title="سجل الرقابة والتتبع الأمني">
            <Head title="سجل الرقابة والأمان - سيستم الأرشيف" />

            {/* Header */}
            <div className="pb-3 border-b border-slate-200 space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <span>سجل التدقيق</span>
                </h2>
            </div>

            {/* Filters Bar */}
            <form onSubmit={applyFilters} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">نوع الإجراء</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                        >
                            <option value="">كافة الإجراءات</option>
                            {Object.entries(availableActions).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">المستخدم المنفذ</label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                        >
                            <option value="">كافة المستخدمين</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">من تاريخ</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">إلى تاريخ</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        إعادة ضبط
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                    >
                        تطبيق الفلاتر
                    </button>
                </div>
            </form>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mt-6">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                            <th className="py-3.5 px-4">المستخدم</th>
                            <th className="py-3.5 px-3">الإجراء المنفذ</th>
                            <th className="py-3.5 px-3">المستند المعني</th>
                            <th className="py-3.5 px-3">التفاصيل الفنية</th>
                            <th className="py-3.5 px-3">عنوان IP</th>
                            <th className="py-3.5 px-3">الوقت والتاريخ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.data.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-semibold text-slate-900">
                                    {log.user?.name || 'مستخدم النظام'}
                                </td>
                                <td className="py-3.5 px-3">
                                    {getActionBadge(log.action)}
                                </td>
                                <td className="py-3.5 px-3">
                                    {log.document ? (
                                        <Link
                                            href={`/documents/${log.document.id}`}
                                            className="font-medium text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 max-w-xs"
                                        >
                                            {log.document.title}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="py-3.5 px-3">
                                    {log.details ? (
                                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs inline-block bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                            {JSON.stringify(log.details)}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="py-3.5 px-3 font-mono text-[11px] text-indigo-700">
                                    {log.ip_address || '127.0.0.1'}
                                </td>
                                <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                                    {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : ''}
                                </td>
                            </tr>
                        ))}

                        {logs.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                                    لا توجد سجلات مطابقة للبحث
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4">
                <Pagination links={logs.links} />
            </div>

        </AppLayout>
    );
}