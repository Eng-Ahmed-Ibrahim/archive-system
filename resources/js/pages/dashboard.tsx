import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowLeft,
    ArrowUpFromLine,
    Bell,
    Building2,
    Calendar,
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
    };
    departments: DeptStat[];
    recentDocuments: DocumentItem[];
}

export default function Dashboard({ stats, departments, recentDocuments }: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    const cards = [
        {
            label: 'كل المستندات المتاحة لي',
            value: stats.total,
            href: '/documents',
            icon: FileText,
            tone: 'bg-indigo-950/80 border-indigo-800/50 text-indigo-400',
        },
        {
            label: 'وارد',
            value: stats.incoming,
            href: '/documents?direction=incoming',
            icon: ArrowDownToLine,
            tone: 'bg-emerald-950/80 border-emerald-800/50 text-emerald-400',
        },
        {
            label: 'صادر',
            value: stats.outgoing,
            href: '/documents?direction=outgoing',
            icon: ArrowUpFromLine,
            tone: 'bg-amber-950/80 border-amber-800/50 text-amber-400',
        },
        {
            label: 'لم أقرأها بعد',
            value: stats.unread,
            href: '/documents?unread=1',
            icon: Bell,
            tone: 'bg-rose-950/80 border-rose-800/50 text-rose-400',
        },
        {
            label: 'مرفوعات اليوم',
            value: stats.today,
            href: '/documents',
            icon: Calendar,
            tone: 'bg-cyan-950/80 border-cyan-800/50 text-cyan-400',
        },
    ];

    return (
        <AppLayout title="لوحة التحكم">
            <Head title="لوحة التحكم - سيستم الأرشيف" />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((c) => (
                    <Link
                        key={c.label}
                        href={c.href}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 p-5 shadow-lg space-y-2 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">{c.label}</span>
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${c.tone}`}>
                                <c.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-white">{c.value}</div>
                    </Link>
                ))}
            </div>

            {/* Departments */}
            {departments.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span>المستندات حسب القسم</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {departments.map((dept) => (
                            <Link
                                key={dept.id}
                                href={`/documents?department_id=${dept.id}`}
                                className="group p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                                        {dept.name}
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                        {dept.code || 'DEPT'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300">
                                        <span className="flex items-center gap-1">
                                            <ArrowDownToLine className="w-3 h-3" />
                                            وارد
                                        </span>
                                        <span className="font-bold">{dept.incoming}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-300">
                                        <span className="flex items-center gap-1">
                                            <ArrowUpFromLine className="w-3 h-3" />
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
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span>أحدث المستندات</span>
                    </h3>
                    <Link
                        href="/documents"
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                        <span>كافة المستندات</span>
                        <ArrowLeft className="w-3 h-3" />
                    </Link>
                </div>

                <DocumentTable documents={recentDocuments} onPreview={(doc) => setPreviewDoc(doc)} />
            </div>

            <FilePreviewModal
                document={previewDoc}
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </AppLayout>
    );
}