import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Building2,
    Calendar,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileCheck,
    FilePlus,
    FileText,
    Folder,
    Hash,
    History,
    Layers,
    Share2,
    Shield,
    Tag as TagIcon,
    Trash2,
    UploadCloud,
    User as UserIcon,
    Users,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import FilePreviewModal from '../../components/FilePreviewModal';
import ShareModal from '../../components/ShareModal';
import AppLayout from '../../layouts/AppLayout';
import type { DocumentItem, DocumentVersion, SharedProps, User } from '../../types';

interface Props {
    document: DocumentItem;
    shareableUsers: User[];
    can: {
        update: boolean;
        delete: boolean;
        download: boolean;
        addVersion: boolean;
        share: boolean;
    };
}

export default function DocumentShow({ document, shareableUsers, can }: Props) {
    const { auth, flash, appName } = usePage<SharedProps>().props;
    const [activeTab, setActiveTab] = useState<'meta' | 'versions' | 'audit' | 'shared'>('meta');
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [selectedPreviewVersion, setSelectedPreviewVersion] = useState<DocumentVersion | null>(null);
    const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const latestVersion = document.latest_version;
    const previewUrl = selectedPreviewVersion
        ? `/documents/${document.id}/preview/${selectedPreviewVersion.id}`
        : `/documents/${document.id}/preview`;

    
    const isPdf = (selectedPreviewVersion || latestVersion)?.mime_type?.includes('pdf');
    const isImage = (selectedPreviewVersion || latestVersion)?.mime_type?.includes('image') || (selectedPreviewVersion || latestVersion)?.mime_type?.includes('svg');

    // New Version Form
    const { data: versionData, setData: setVersionData, post: postVersion, processing: versionProcessing, reset: resetVersion, errors: versionErrors } = useForm({
        file: null as File | null,
        change_notes: '',
    });

    const handleVersionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postVersion(`/documents/${document.id}/versions`, {
            onSuccess: () => {
                setNewVersionModalOpen(false);
                resetVersion();
            },
        });
    };

    const handleDelete = () => {
        if (confirm(`هل أنت متأكد من حذف المستند "${document.title}" ونقله لسلة المحذوفات؟`)) {
            router.delete(`/documents/${document.id}`);
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    return (
        <AppLayout title={document.title}>
            <Head title={`${document.title} - سيستم الأرشيف`} />

            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Link href="/documents" className="hover:text-indigo-400">الأرشيف</Link>
                        <span>/</span>
                        <span>{document.department?.name || 'عام'}</span>
                        <span>/</span>
                        <span className="text-slate-200">{document.category?.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-lg sm:text-xl font-black text-white">
                            {document.title}
                        </h2>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                            {document.reference_no}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-semibold">
                            v{latestVersion?.version_no || 1}
                        </span>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {can.download && (
                        <a
                            href={`/documents/${document.id}/download`}
                            download
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>تحميل الملف</span>
                        </a>
                    )}

                    {can.addVersion && (
                        <button
                            type="button"
                            onClick={() => setNewVersionModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/60 text-purple-200 text-xs font-semibold shadow transition-colors"
                        >
                            <Layers className="w-4 h-4 text-purple-300" />
                            <span>إصدار جديد</span>
                        </button>
                    )}

                    {can.share && (
                        <button
                            type="button"
                            onClick={() => setShareModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold shadow transition-colors"
                        >
                            <Share2 className="w-4 h-4 text-cyan-400" />
                            <span>مشاركة</span>
                        </button>
                    )}

                    {can.delete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                            title="حذف المستند"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Split View: Left Preview + Right Metadata & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Inline Preview Pane (7 Cols) */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col h-[700px]">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-slate-200">
                                معاينة الملف (الإصدار v{selectedPreviewVersion?.version_no || latestVersion?.version_no || 1})
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>نافذة كاملة</span>
                            </a>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
                        {isPdf ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-xl border border-slate-800 bg-white"
                                title={document.title}
                            />
                        ) : isImage ? (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <img
                                    src={previewUrl}
                                    alt={document.title}
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-xl border border-slate-800"
                                />
                            </div>
                        ) : (
                            <div className="text-center p-8 space-y-3">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                                <div className="text-xs font-semibold text-slate-300">
                                    المعاينة المباشرة غير مدعومة لهذا النوع من الملفات
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    ({latestVersion?.mime_type})
                                </p>
                                <a
                                    href={`/documents/${document.id}/download`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                                    download
                                >
                                    <Download className="w-4 h-4" />
                                    تحميل الملف للفتح محلياً
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Tabs & Metadata Pane (5 Cols) */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-800 bg-slate-900/90 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setActiveTab('meta')}
                            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                                activeTab === 'meta'
                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            البيانات الوصفية
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('versions')}
                            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                                activeTab === 'versions'
                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            الإصدارات ({document.versions?.length || 1})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('audit')}
                            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                                activeTab === 'audit'
                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            سجل الحركات
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('shared')}
                            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                                activeTab === 'shared'
                                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            المشاركة ({document.access_list?.length || 0})
                        </button>
                    </div>

                    {/* Tab 1: Metadata */}
                    {activeTab === 'meta' && (
                        <div className="p-5 space-y-4">
                            <div className="divide-y divide-slate-800/80 text-xs">
                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                        القسم المالك:
                                    </span>
                                    <span className="font-semibold text-slate-200">{document.department?.name}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                                        المجلد والتصنيف:
                                    </span>
                                    <span className="font-semibold text-slate-200">{document.category?.name}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                        نوع المستند:
                                    </span>
                                    <span className="font-semibold text-slate-200">{document.type?.name || 'غير محدد'}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        تاريخ المستند:
                                    </span>
                                    <span className="font-semibold text-slate-200">{document.doc_date}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                        الجهة / المستخدم الرافع:
                                    </span>
                                    <span className="font-semibold text-slate-200">{document.uploader?.name || 'النظام'}</span>
                                </div>

                                <div className="py-2.5 flex items-center justify-between">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                                        حجم الملف الأصلي:
                                    </span>
                                    <span className="font-mono text-slate-300">{formatBytes(latestVersion?.file_size)}</span>
                                </div>

                                <div className="py-2.5 flex flex-col gap-1">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                        البصمة الرقمية المشفرة (SHA-256):
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 break-all">
                                        {latestVersion?.file_hash || 'غير متوفر'}
                                    </span>
                                </div>
                            </div>

                            {/* Tags Section */}
                            <div className="pt-2 border-t border-slate-800 space-y-2">
                                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                    <TagIcon className="w-3.5 h-3.5" />
                                    <span>الوسوم والكلمات الدلالية:</span>
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {document.tags && document.tags.length > 0 ? (
                                        document.tags.map((t) => (
                                            <span
                                                key={t.id}
                                                className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-700/50 text-indigo-300"
                                            >
                                                #{t.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-500">لا توجد وسوم مضافة</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Versions History */}
                    {activeTab === 'versions' && (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <span className="text-xs text-slate-400">تاريخ التعديلات والنسخ المحفوظة</span>
                                {can.addVersion && (
                                    <button
                                        type="button"
                                        onClick={() => setNewVersionModalOpen(true)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                                    >
                                        + رفع إصدار جديد
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
                                {document.versions?.map((ver) => {
                                    const isCurrent = ver.id === latestVersion?.id;
                                    const isViewingThis = selectedPreviewVersion ? selectedPreviewVersion.id === ver.id : isCurrent;

                                    return (
                                        <div
                                            key={ver.id}
                                            className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                                                isViewingThis
                                                    ? 'bg-indigo-950/40 border-indigo-500/60'
                                                    : 'bg-slate-950/50 border-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">
                                                        الإصدار v{ver.version_no}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                            الأحدث
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPreviewVersion(ver)}
                                                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                        title="معاينة هذا الإصدار في لوحة العرض"
                                                    >
                                                        معاينة
                                                    </button>
                                                    <a
                                                        href={`/documents/${document.id}/versions/${ver.id}/download`}
                                                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                                                        title="تحميل هذا الإصدار"
                                                        download
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="text-slate-300 font-medium">
                                                {ver.original_name} • <span className="font-mono text-slate-400">{formatBytes(ver.file_size)}</span>
                                            </div>

                                            {ver.change_notes && (
                                                <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                    {ver.change_notes}
                                                </div>
                                            )}

                                            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                                                <span>رفع بواسطة: {ver.uploader?.name || 'مستخدم'}</span>
                                                <span className="font-mono">
                                                    {ver.created_at ? new Date(ver.created_at).toLocaleDateString('ar-EG') : ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Audit Trail */}
                    {activeTab === 'audit' && (
                        <div className="p-4 space-y-3">
                            <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                                سجل أمني بالوصول والتحميل والتعديل لهذا المستند
                            </div>

                            <div className="divide-y divide-slate-800/80 max-h-[550px] overflow-y-auto">
                                {document.audit_logs?.map((log) => (
                                    <div key={log.id} className="py-2.5 first:pt-0 space-y-1 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-200">{log.user?.name || 'النظام'}</span>
                                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                                                {log.action}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                                            <span>IP: {log.ip_address || '127.0.0.1'}</span>
                                            <span className="text-[10px] text-slate-500">
                                                {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {(!document.audit_logs || document.audit_logs.length === 0) && (
                                    <div className="text-center py-8 text-xs text-slate-500">
                                        لا توجد حركات مسجلة بعد
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Shared Users */}
                    {activeTab === 'shared' && (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <span className="text-xs text-slate-400">المستخدمون خارج القسم الممنوحون حق الوصول</span>
                                {can.share && (
                                    <button
                                        type="button"
                                        onClick={() => setShareModalOpen(true)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                                    >
                                        + مشاركة مع مستخدم
                                    </button>
                                )}
                            </div>

                            <div className="divide-y divide-slate-800/80">
                                {document.access_list && document.access_list.length > 0 ? (
                                    document.access_list.map((acc) => (
                                        <div key={acc.id} className="py-2.5 flex items-center justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-slate-200">{acc.user?.name}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    الصلاحية: <span className="text-indigo-400 font-medium font-mono">{acc.access_level}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-xs text-slate-500">
                                        لم يتم مشاركة المستند خارج القسم بعد
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Upload New Version */}
            {newVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-bold text-white">
                                    رفع نسخة وإصدار جديد (v{(latestVersion?.version_no || 1) + 1})
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNewVersionModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleVersionSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    الملف الجديد المحدث <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="file"
                                    onChange={(e) => setVersionData('file', e.target.files?.[0] || null)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                    required
                                />
                                {versionErrors.file && (
                                    <p className="text-[11px] text-rose-400">{versionErrors.file}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    ملاحظات التعديل في هذا الإصدار
                                </label>
                                <textarea
                                    value={versionData.change_notes}
                                    onChange={(e) => setVersionData('change_notes', e.target.value)}
                                    rows={3}
                                    placeholder="ما هي التغييرات التي طرأت على هذا الإصدار؟"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setNewVersionModalOpen(false)}
                                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={versionProcessing || !versionData.file}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {versionProcessing ? 'جارٍ رفع الإصدار...' : 'حفظ الإصدار الجديد'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Share Document */}
            <ShareModal
                document={document}
                shareableUsers={shareableUsers}
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
            />
        </AppLayout>
    );
}
