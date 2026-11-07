import { Link, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    Download,
    Eye,
    FileCheck,
    FileCode,
    FileSpreadsheet,
    FileText,
    Folder,
    Hash,
    Image,
    Layers,
    Tag as TagIcon,
    Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import type { DocumentItem, SharedProps } from '../types';

interface Props {
    documents: DocumentItem[];
    onPreview?: (doc: DocumentItem) => void;
    showDepartment?: boolean;
}

export default function DocumentTable({ documents, onPreview, showDepartment = true }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const { auth, flash, appName } = usePage<SharedProps>().props;

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <FileText className="w-5 h-5 text-indigo-400" />;
        if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-400" />;
        if (mimeType.includes('image') || mimeType.includes('svg')) return <Image className="w-5 h-5 text-emerald-400" />;
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
        return <FileCode className="w-5 h-5 text-indigo-400" />;
    };

    const handleDelete = (doc: DocumentItem) => {
        if (confirm(`هل أنت متأكد من رغبتك في نقل المستند "${doc.title}" إلى سلة المحذوفات؟`)) {
            setDeletingId(doc.id);
            router.delete(`/documents/${doc.id}`, {
                onFinish: () => setDeletingId(null),
            });
        }
    };

    if (documents.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">لا توجد مستندات مطابقة</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    لم يتم العثور على مستندات في هذا القسم أو المجلد، أو لا تطابق معايير البحث الحالية.
                </p>
                {['admin', 'archivist'].some((role) => auth.user.roles?.includes(role)) && (
                    <Link
                        href="/documents/create"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                    >
                        رفع ملف جديد
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
            <table className="w-full text-right text-xs">
                <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/80">
                        <th className="py-3 px-4">المستند والرقم المرجعي</th>
                        <th className="py-3 px-3">التصنيف والنوع</th>
                        {showDepartment && <th className="py-3 px-3">القسم</th>}
                        <th className="py-3 px-3">تاريخ المستند</th>
                        <th className="py-3 px-3">الإصدار والحجم</th>
                        <th className="py-3 px-3 text-left">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {documents.map((doc) => {
                        const version = doc.latest_version;
                        const isDeleting = deletingId === doc.id;

                        return (
                            <tr
                                key={doc.id}
                                className={`hover:bg-slate-800/40 transition-colors group ${isDeleting ? 'opacity-40 pointer-events-none' : ''
                                    }`}
                            >
                                {/* Document Title & Ref */}
                                <td className="py-3.5 px-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0 group-hover:border-indigo-500/50 transition-colors">
                                            {getFileIcon(version?.mime_type)}
                                        </div>
                                        <div className="space-y-1">
                                            <Link
                                                href={`/documents/${doc.id}`}
                                                className="font-bold text-slate-100 hover:text-indigo-400 transition-colors text-xs sm:text-sm line-clamp-1"
                                            >
                                                {doc.title}
                                            </Link>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <span className="flex items-center gap-0.5 font-mono text-cyan-400/90 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                                    <Hash className="w-2.5 h-2.5" />
                                                    {doc.reference_no}
                                                </span>
                                                {doc.tags && doc.tags.length > 0 && (
                                                    <div className="hidden sm:flex items-center gap-1">
                                                        {doc.tags.slice(0, 2).map((t) => (
                                                            <span
                                                                key={t.id}
                                                                className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300"
                                                            >
                                                                #{t.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Category & Type */}
                                <td className="py-3.5 px-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-slate-300 font-medium truncate max-w-[160px]">
                                            <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                                            <span>{doc.category?.name || 'غير مصنف'}</span>
                                        </div>
                                        {doc.type && (
                                            <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                                                {doc.type.name}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Department */}
                                {showDepartment && (
                                    <td className="py-3.5 px-3">
                                        <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 inline-block">
                                            {doc.department?.name || 'عام'}
                                        </span>
                                    </td>
                                )}

                                {/* Date */}
                                <td className="py-3.5 px-3">
                                    <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                                        <Calendar className="w-3 h-3" />
                                        <span>{doc.doc_date}</span>
                                    </div>
                                </td>

                                {/* Version & Size */}
                                <td className="py-3.5 px-3">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                                            <Layers className="w-3 h-3 text-cyan-400" />
                                            <span>v{version?.version_no || 1}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            {version?.formatted_size || (version?.file_size ? `${Math.round(version.file_size / 1024)} KB` : '-')}
                                        </div>
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-3 text-left">
                                    <div className="flex items-center justify-end gap-1">
                                        {onPreview && (
                                            <button
                                                type="button"
                                                onClick={() => onPreview(doc)}
                                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                title="معاينة سريعة للملف"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        <a
                                            href={`/documents/${doc.id}/download`}
                                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                                            title="تحميل الملف"
                                            download
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </a>

                                        <Link
                                            href={`/documents/${doc.id}`}
                                            className="p-1.5 rounded-lg bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 hover:text-white transition-colors"
                                            title="تفاصيل المستند والإصدارات"
                                        >
                                            <FileCheck className="w-3.5 h-3.5" />
                                        </Link>

                                        {['admin', 'archivist'].some((role) => auth.user.roles?.includes(role)) && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(doc)}
                                                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                                title="حذف المستند"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div >
    );
}
