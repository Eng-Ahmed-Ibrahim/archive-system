import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowLeft,
    ArrowUpFromLine,
    Bell,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileCheck,
    FileText,
} from 'lucide-react';
import React, { useState } from 'react';
import DocumentTable from '../components/DocumentTable';
import FilePreviewModal from '../components/FilePreviewModal';
import AppLayout from '../layouts/AppLayout';
import type { DocumentItem } from '../types';

interface DeptStat {
    id: number;
    name: string;
    code?: string | null;
    incoming: number;
    outgoing: number;
}

interface Props {
    stats: {
        total: number;
        incoming: number;
        outgoing: number;
        today: number;
        unread: number;
        pending?: number;
        finish?: number;
    };
    departments: DeptStat[];
    recentDocuments: DocumentItem[];
}

export default function Dashboard({ stats, departments, recentDocuments }: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    const cards = [
        {
            label: 'كل المستندات',
            value: stats.total,
            href: '/documents',
            icon: FileText,
            tone: 'bg-indigo-50 border-indigo-200 text-indigo-600',
        },
        {
            label: 'قيد الإجراء (Pending)',
            value: stats.pending ?? 0,
            href: '/documents?status=pending',
            icon: Clock,
            tone: 'bg-amber-50 border-amber-200 text-amber-600',
        },
        {
            label: 'مكتمل (Finish)',
            value: stats.finish ?? 0,
            href: '/documents?status=finish',
            icon: CheckCircle2,
            tone: 'bg-emerald-50 border-emerald-200 text-emerald-600',
        },
        {
            label: 'وارد',
            value: stats.incoming,
            href: '/documents?direction=incoming',
            icon: ArrowDownToLine,
            tone: 'bg-teal-50 border-teal-200 text-teal-600',
        },
        {
            label: 'صادر',
            value: stats.outgoing,
            href: '/documents?direction=outgoing',
            icon: ArrowUpFromLine,
            tone: 'bg-cyan-50 border-cyan-200 text-cyan-600',
        },
        {
            label: 'لم أقرأها بعد',
            value: stats.unread,
            href: '/documents?unread=1',
            icon: Bell,
            tone: 'bg-rose-50 border-rose-200 text-rose-600',
        },
    ];

    return (
        <AppLayout title="لوحة التحكم">
            <Head title="لوحة التحكم - سيستم الأرشيف" />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {cards.map((c) => (
                    <Link
                        key={c.label}
                        href={c.href}
                        className="rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 p-5 shadow-sm space-y-2 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">{c.label}</span>
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-2xs ${c.tone}`}>
                                <c.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{c.value}</div>
                    </Link>
                ))}
            </div>

            {/* Departments */}
            {departments.length > 0 && (
                <div className="space-y-3 mt-6">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>المستندات حسب القسم</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {departments.map((dept) => (
                            <Link
                                key={dept.id}
                                href={`/documents?department_id=${dept.id}`}
                                className="group p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                                        {dept.name}
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {dept.code || 'DEPT'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
                                        <span className="flex items-center gap-1 font-medium">
                                            <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                                            وارد
                                        </span>
                                        <span className="font-bold">{dept.incoming}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
                                        <span className="flex items-center gap-1 font-medium">
                                            <ArrowUpFromLine className="w-3 h-3 text-amber-600" />
                                            صادر
                                        </span>
                                        <span className="font-bold">{dept.outgoing}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent documents */}
            <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        <span>أحدث المستندات</span>
                    </h3>
                    <Link
                        href="/documents"
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                        <span>كافة المستندات</span>
                        <ArrowLeft className="w-3 h-3" />
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <DocumentTable documents={recentDocuments} onPreview={(doc) => setPreviewDoc(doc)} />
                </div>
            </div>

            <FilePreviewModal
                document={previewDoc}
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
            />

        </AppLayout>
    );
}