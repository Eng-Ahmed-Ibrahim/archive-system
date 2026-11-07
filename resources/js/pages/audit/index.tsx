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
            upload: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
            view: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
            download: 'bg-blue-950/60 text-blue-400 border-blue-800/40',
            new_version: 'bg-purple-950/60 text-purple-400 border-purple-800/40',
            edit_metadata: 'bg-amber-950/60 text-amber-400 border-amber-800/40',
            delete: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
            share: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/40',
            revoke_share: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
            login: 'bg-slate-800 text-slate-300 border-slate-700',
            demo_login: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/40',
        };

        const color = actionColors[act] || 'bg-slate-800 text-slate-400 border-slate-700';
        const label = availableActions[act] || act;

        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${color} font-medium`}>
                {label}
            </span>
        );
    };

    return (
        <AppLayout title="سجل الرقابة والتتبع الأمني">
            <Head title="سجل الرقابة والأمان - سيستم الأرشيف" />

            {/* Header */}
            <div className="pb-2 border-b border-slate-800 space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    <span>سجل التدقيق</span>
                </h2>
          
            </div>

            {/* Filters Bar */}
            <form onSubmit={applyFilters} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">نوع الإجراء</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">كافة الإجراءات</option>
                            {Object.entries(availableActions).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">المستخدم المنفذ</label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">كافة المستخدمين</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">من تاريخ</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">إلى تاريخ</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                        إعادة ضبط
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
                    >
                        تطبيق الفلاتر
                    </button>
                </div>
            </form>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/80">
                            <th className="py-3 px-4">المستخدم</th>
                            <th className="py-3 px-3">الإجراء المنفذ</th>
                            <th className="py-3 px-3">المستند المعني</th>
                            <th className="py-3 px-3">التفاصيل الفنية</th>
                            <th className="py-3 px-3">عنوان IP</th>
                            <th className="py-3 px-3">الوقت والتاريخ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {logs.data.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-200">
                                    {log.user?.name || 'مستخدم النظام'}
                                </td>
                                <td className="py-3 px-3">
                                    {getActionBadge(log.action)}
                                </td>
                                <td className="py-3 px-3">
                                    {log.document ? (
                                        <Link
                                            href={`/documents/${log.document.id}`}
                                            className="font-medium text-slate-200 hover:text-indigo-400 transition-colors line-clamp-1 max-w-xs"
                                        >
                                            {log.document.title}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-500">-</span>
                                    )}
                                </td>
                                <td className="py-3 px-3">
                                    {log.details ? (
                                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs inline-block">
                                            {JSON.stringify(log.details)}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">-</span>
                                    )}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px] text-cyan-400/90">
                                    {log.ip_address || '127.0.0.1'}
                                </td>
                                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                    {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : ''}
                                </td>
                            </tr>
                        ))}

                        {logs.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                                    لا توجد سجلات مطابقة للبحث
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination links={logs.links} />
        </AppLayout>
    );
}
