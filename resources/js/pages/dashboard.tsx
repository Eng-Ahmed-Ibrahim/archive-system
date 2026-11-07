import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    Database,
    FileCheck,
    FilePlus,
    FileText,
    FolderTree,
    HardDrive,
    History,
    Search,
    Shield,
    TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import DocumentTable from '../components/DocumentTable';
import FilePreviewModal from '../components/FilePreviewModal';
import AppLayout from '../layouts/AppLayout';
import type { AuditLog, Department, DocumentItem } from '../types';

interface Props {
    stats: {
        totalDocuments: number;
        todayDocuments: number;
        totalDepartments: number;
        storageFormatted: string;
        storageBytes: number;
    };
    recentDocuments: DocumentItem[];
    recentActivities: AuditLog[];
    departments: Department[];
}

export default function Dashboard({ stats, recentDocuments, recentActivities, departments }: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    const getActionBadge = (action: string) => {
        const actionMap: Record<string, { label: string; color: string }> = {
            upload: { label: 'رفع جديد', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' },
            view: { label: 'معاينة', color: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40' },
            download: { label: 'تحميل', color: 'bg-blue-950/60 text-blue-400 border-blue-800/40' },
            new_version: { label: 'إصدار جديد', color: 'bg-purple-950/60 text-purple-400 border-purple-800/40' },
            edit_metadata: { label: 'تعديل بيانات', color: 'bg-amber-950/60 text-amber-400 border-amber-800/40' },
            delete: { label: 'حذف', color: 'bg-rose-950/60 text-rose-400 border-rose-800/40' },
            share: { label: 'مشاركة', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/40' },
            login: { label: 'دخول', color: 'bg-slate-800 text-slate-300 border-slate-700' },
            demo_login: { label: 'تبديل تجريبي', color: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/40' },
        };

        const item = actionMap[action] || { label: action, color: 'bg-slate-800 text-slate-400 border-slate-700' };
        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.color} font-medium`}>
                {item.label}
            </span>
        );
    };

    return (
        <AppLayout title="لوحة التحكم">
            <Head title="لوحة التحكم - سيستم الأرشيف" />

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">إجمالي المستندات</span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.totalDocuments}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        <span>مستند مؤرشف ومفهرس بالكامل</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">مرفوعات اليوم</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.todayDocuments}</div>
                    <div className="text-[11px] text-emerald-400/80 flex items-center gap-1">
                        <span>نشاط الأرشفة لهذا اليوم</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">المساحة التخزينية المستخدمة</span>
                        <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
                            <HardDrive className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.storageFormatted}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>تخزين آمن (Private Storage)</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">الأقسام المرتبطة</span>
                        <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.totalDepartments}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>عزل كامل للأذونات والمستندات</span>
                    </div>
                </div>
            </div>

            {/* Department Shortcuts Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span>الاقسام</span>
                    </h3>
                    <Link href="/departments" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                        <span>عرض الكل</span>
                        <ArrowLeft className="w-3 h-3" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {departments.map((dept) => (
                        <Link
                            key={dept.id}
                            href={`/documents?department_id=${dept.id}`}
                            className="group p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md flex items-center justify-between"
                        >
                            <div className="space-y-1 truncate">
                                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                                    {dept.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    {dept.documents_count || 0} مستند مؤرشف
                                </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {dept.code || 'DEPT'}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Two Column Section: Recent Uploads & Activity Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Documents Table (2 Cols) */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-400" />
                            <span>أحدث المستندات المؤرشفة</span>
                        </h3>
                        <Link href="/documents" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                            <span>كافة المستندات</span>
                            <ArrowLeft className="w-3 h-3" />
                        </Link>
                    </div>

                    <DocumentTable
                        documents={recentDocuments}
                        onPreview={(doc) => setPreviewDoc(doc)}
                    />
                </div>

                {/* Audit & Activities Timeline (1 Col) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <span>سجل النشاطات الأخير</span>
                        </h3>
                        <Link href="/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                            <span>السجل الكامل</span>
                            <ArrowLeft className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-xl space-y-3">
                        <div className="divide-y divide-slate-800/60">
                            {recentActivities.map((act) => (
                                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                                            {act.user?.name || 'مستخدم غير معروف'}
                                        </span>
                                        {getActionBadge(act.action)}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                        <span className="truncate max-w-[180px]">
                                            {act.document?.title || (act.details as any)?.name || 'نشاط في النظام'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {act.created_at ? new Date(act.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {recentActivities.length === 0 && (
                                <div className="text-center py-6 text-xs text-slate-500">
                                    لا توجد نشاطات مسجلة بعد
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <FilePreviewModal
                document={previewDoc}
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </AppLayout>
    );
}
