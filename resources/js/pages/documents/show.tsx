import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Building2,
    Calendar,
    CheckCheck,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Folder,
    Layers,
    MessageSquare,
    Send,
    Share2,
    Shield,
    Trash2,
    User as UserIcon,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import ShareModal from '../../components/ShareModal';
import AppLayout from '../../layouts/AppLayout';
import type { DocumentItem, DocumentVersion, SharedProps, User } from '../../types';

interface RecipientItem {
    id: number;
    priority: number;
    status: 'pending' | 'read';
    read_at?: string | null;
    user?: { id: number; name: string };
    sender?: { id: number; name: string } | null;
    department?: { id: number; name: string };
}

interface CommentItem {
    id: number;
    body: string;
    created_at?: string;
    user?: { id: number; name: string };
}

type FullDocument = DocumentItem & {
    direction?: 'incoming' | 'outgoing';
    recipients?: RecipientItem[];
    comments?: CommentItem[];
};

interface ForwardableUser {
    id: number;
    name: string;
    order_num: number | null;
    department?: { id: number; name: string } | null;
}

interface Props {
    document: FullDocument;
    shareableUsers: User[];
    forwardableUsers: ForwardableUser[];
    can: {
        update: boolean;
        delete: boolean;
        download: boolean;
        addVersion: boolean;
        share: boolean;
        forward: boolean;
    };
}

type Tab = 'meta' | 'comments' | 'recipients' | 'versions' | 'audit';

export default function DocumentShow({ document, shareableUsers, forwardableUsers, can }: Props) {
    const { auth } = usePage<SharedProps>().props;
    const roles: string[] = (auth.user as any).roles ?? [];
    const isAdmin = roles.includes('admin');

    const [activeTab, setActiveTab] = useState<Tab>('meta');
    const [selectedPreviewVersion, setSelectedPreviewVersion] = useState<DocumentVersion | null>(null);
    const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [forwardModalOpen, setForwardModalOpen] = useState(false);

    const latestVersion = document.latest_version;
    const currentVersion = selectedPreviewVersion || latestVersion;
    const previewUrl = selectedPreviewVersion
        ? `/documents/${document.id}/preview/${selectedPreviewVersion.id}`
        : `/documents/${document.id}/preview`;

    const isPdf = currentVersion?.mime_type?.includes('pdf');
    const isImage = currentVersion?.mime_type?.includes('image') || currentVersion?.mime_type?.includes('svg');

    const recipients = document.recipients ?? [];
    const comments = document.comments ?? [];

    // ---------- Forms ----------
    const {
        data: versionData,
        setData: setVersionData,
        post: postVersion,
        processing: versionProcessing,
        reset: resetVersion,
        errors: versionErrors,
    } = useForm({ file: null as File | null, change_notes: '' });

    const {
        data: commentData,
        setData: setCommentData,
        post: postComment,
        processing: commentProcessing,
        reset: resetComment,
        errors: commentErrors,
    } = useForm({ body: '' });

    const {
        data: forwardData,
        setData: setForwardData,
        post: postForward,
        processing: forwardProcessing,
        reset: resetForward,
        errors: forwardErrors,
    } = useForm({ user_ids: [] as number[], note: '' });

    const handleVersionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postVersion(`/documents/${document.id}/versions`, {
            forceFormData: true,
            onSuccess: () => {
                setNewVersionModalOpen(false);
                resetVersion();
            },
        });
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postComment(`/documents/${document.id}/comments`, {
            preserveScroll: true,
            onSuccess: () => resetComment(),
        });
    };

    const handleForwardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postForward(`/documents/${document.id}/forward`, {
            preserveScroll: true,
            onSuccess: () => {
                setForwardModalOpen(false);
                resetForward();
            },
        });
    };

    const toggleForwardUser = (id: number) => {
        setForwardData(
            'user_ids',
            forwardData.user_ids.includes(id)
                ? forwardData.user_ids.filter((x) => x !== id)
                : [...forwardData.user_ids, id],
        );
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

    const tabs: { key: Tab; label: string }[] = [
        { key: 'meta', label: 'البيانات' },
        { key: 'comments', label: `التعليقات (${comments.length})` },
        { key: 'recipients', label: `المسار (${recipients.length})` },
        { key: 'versions', label: `الإصدارات (${document.versions?.length || 1})` },
        ...(isAdmin ? [{ key: 'audit' as Tab, label: 'السجل' }] : []),
    ];

    return (
        <AppLayout title={document.title}>
            <Head title={`${document.title} - سيستم الأرشيف`} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Link href="/documents" className="hover:text-indigo-400">
                            الأرشيف
                        </Link>
                        <span>/</span>
                        <span>{document.department?.name || 'عام'}</span>
                        <span>/</span>
                        <span className="text-slate-200">{document.category?.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-lg sm:text-xl font-black text-white">{document.title}</h2>

                        {document.direction && (
                            <span
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                                    document.direction === 'incoming'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                                        : 'bg-amber-950 text-amber-300 border-amber-800/50'
                                }`}
                            >
                                {document.direction === 'incoming' ? (
                                    <ArrowDownToLine className="w-3 h-3" />
                                ) : (
                                    <ArrowUpFromLine className="w-3 h-3" />
                                )}
                                {document.direction === 'incoming' ? 'وارد' : 'صادر'}
                            </span>
                        )}

                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                            {document.reference_no}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                            v{latestVersion?.version_no || 1}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {can.forward && (
                        <button
                            type="button"
                            onClick={() => setForwardModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>تحويل</span>
                        </button>
                    )}

                    {can.download && (
                        <a
                            href={`/documents/${document.id}/download`}
                            download
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold shadow transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>تحميل</span>
                        </a>
                    )}

                    {/* {can.addVersion && (
                        <button
                            type="button"
                            onClick={() => setNewVersionModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/60 text-purple-200 text-xs font-semibold shadow transition-colors"
                        >
                            <Layers className="w-4 h-4 text-purple-300" />
                            <span>إصدار جديد</span>
                        </button>
                    )} */}


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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Preview */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col h-[700px]">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-slate-200">
                                معاينة الملف (v{currentVersion?.version_no || 1})
                            </span>
                        </div>

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
                                {can.download && (
                                    <a
                                        href={`/documents/${document.id}/download`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                                        download
                                    >
                                        <Download className="w-4 h-4" />
                                        تحميل الملف للفتح محلياً
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col">
                    <div className="flex border-b border-slate-800 bg-slate-900/90 text-xs font-semibold overflow-x-auto">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setActiveTab(t.key)}
                                className={`flex-1 whitespace-nowrap px-3 py-3 text-center transition-colors border-b-2 ${
                                    activeTab === t.key
                                        ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Meta */}
                    {activeTab === 'meta' && (
                        <div className="p-5 divide-y divide-slate-800/80 text-xs">
                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                    القسم:
                                </span>
                                <span className="font-semibold text-slate-200">{document.department?.name}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                                    المجلد:
                                </span>
                                <span className="font-semibold text-slate-200">{document.category?.name}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    تاريخ المستند:
                                </span>
                                <span className="font-semibold text-slate-200">{document.doc_date}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <UserIcon className="w-3.5 h-3.5" />
                                    الرافع:
                                </span>
                                <span className="font-semibold text-slate-200">{document.uploader?.name || 'النظام'}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                                    حجم الملف:
                                </span>
                                <span className="font-mono text-slate-300">{formatBytes(latestVersion?.file_size)}</span>
                            </div>

                            <div className="py-2.5 flex flex-col gap-1">
                                <span className="text-slate-400 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                    البصمة الرقمية (SHA-256):
                                </span>
                                <span className="font-mono text-[10px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800 break-all">
                                    {latestVersion?.file_hash || 'غير متوفر'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    {activeTab === 'comments' && (
                        <div className="p-4 space-y-4">
                            <form onSubmit={handleCommentSubmit} className="space-y-2">
                                <textarea
                                    value={commentData.body}
                                    onChange={(e) => setCommentData('body', e.target.value)}
                                    rows={3}
                                    placeholder="اكتب تعليقاً على المستند..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                {commentErrors.body && <p className="text-[11px] text-rose-400">{commentErrors.body}</p>}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={commentProcessing || !commentData.body.trim()}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        {commentProcessing ? 'جارٍ الإرسال...' : 'إضافة تعليق'}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2.5 max-h-[450px] overflow-y-auto">
                                {comments.map((c) => (
                                    <div key={c.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-200">{c.user?.name || 'مستخدم'}</span>
                                            <span className="text-slate-500 font-mono">
                                                {c.created_at ? new Date(c.created_at).toLocaleString('ar-EG') : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 whitespace-pre-line">{c.body}</p>
                                    </div>
                                ))}

                                {comments.length === 0 && (
                                    <div className="text-center py-8 text-xs text-slate-500">لا توجد تعليقات بعد</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recipients / Route */}
                    {activeTab === 'recipients' && (
                        <div className="p-4 space-y-3">
                            <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                                من وصله المستند وحالة قراءته
                            </div>

                            <div className="divide-y divide-slate-800/80 max-h-[550px] overflow-y-auto">
                                {recipients.map((r) => (
                                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                                    #{r.priority}
                                                </span>
                                                <span className="font-semibold text-slate-200 truncate">{r.user?.name}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {r.department?.name}
                                                {r.sender ? ` • من: ${r.sender.name}` : ''}
                                            </div>
                                        </div>

                                        {r.status === 'read' ? (
                                            <span
                                                className="shrink-0 inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40"
                                                title={r.read_at ? new Date(r.read_at).toLocaleString('ar-EG') : ''}
                                            >
                                                <CheckCheck className="w-3 h-3" />
                                                تمت القراءة
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                                <Clock className="w-3 h-3" />
                                                لم يُقرأ
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {recipients.length === 0 && (
                                    <div className="text-center py-8 text-xs text-slate-500">لم يُرسل المستند لأحد بعد</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Versions */}
                    {activeTab === 'versions' && (
                        <div className="p-4 space-y-3">
                            <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
                                {document.versions?.map((ver) => {
                                    const isCurrent = ver.id === latestVersion?.id;
                                    const isViewingThis = selectedPreviewVersion
                                        ? selectedPreviewVersion.id === ver.id
                                        : isCurrent;

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
                                                    <span className="font-bold text-white text-sm">v{ver.version_no}</span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] px-1.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                                                            الأحدث
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPreviewVersion(ver)}
                                                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                    >
                                                        معاينة
                                                    </button>
                                                    {can.download && (
                                                        <a
                                                            href={`/documents/${document.id}/versions/${ver.id}/download`}
                                                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                                                            title="تحميل"
                                                            download
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-slate-300">
                                                {ver.original_name} •{' '}
                                                <span className="font-mono text-slate-400">{formatBytes(ver.file_size)}</span>
                                            </div>

                                            {ver.change_notes && (
                                                <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                                    {ver.change_notes}
                                                </div>
                                            )}

                                            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                                                <span>بواسطة: {ver.uploader?.name || 'مستخدم'}</span>
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

                    {/* Audit (admin) */}
                    {activeTab === 'audit' && isAdmin && (
                        <div className="p-4 divide-y divide-slate-800/80 max-h-[550px] overflow-y-auto">
                            {document.audit_logs?.map((log) => (
                                <div key={log.id} className="py-2.5 first:pt-0 space-y-1 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-200">{log.user?.name || 'النظام'}</span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                                            {log.action}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                        {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : ''}
                                    </div>
                                </div>
                            ))}

                            {(!document.audit_logs || document.audit_logs.length === 0) && (
                                <div className="text-center py-8 text-xs text-slate-500">لا توجد حركات مسجلة</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Forward Modal */}
            {forwardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md max-h-[95vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">تحويل المستند</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForwardModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleForwardSubmit} className="p-5 space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اختر الموظفين <span className="text-rose-400">*</span>
                                </label>

                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                    {forwardableUsers.map((u) => {
                                        const checked = forwardData.user_ids.includes(u.id);
                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-colors ${
                                                    checked
                                                        ? 'bg-indigo-950/50 border-indigo-600 text-white'
                                                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleForwardUser(u.id)}
                                                    className="accent-indigo-500"
                                                />
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                                                    #{u.order_num ?? '-'}
                                                </span>
                                                <span className="truncate">{u.name}</span>
                                                {isAdmin && u.department && (
                                                    <span className="mr-auto text-[10px] text-slate-500 truncate">
                                                        {u.department.name}
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>

                                {forwardErrors.user_ids && <p className="text-[11px] text-rose-400">{forwardErrors.user_ids}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">ملاحظة (اختياري)</label>
                                <textarea
                                    value={forwardData.note}
                                    onChange={(e) => setForwardData('note', e.target.value)}
                                    rows={3}
                                    placeholder="تظهر كتعليق على المستند..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setForwardModalOpen(false)}
                                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={forwardProcessing || forwardData.user_ids.length === 0}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {forwardProcessing ? 'جارٍ التحويل...' : `تحويل (${forwardData.user_ids.length})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Version Modal */}
            {newVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-bold text-white">
                                    رفع إصدار جديد (v{(latestVersion?.version_no || 1) + 1})
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
                                    الملف الجديد <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="file"
                                    onChange={(e) => setVersionData('file', e.target.files?.[0] || null)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                    required
                                />
                                {versionErrors.file && <p className="text-[11px] text-rose-400">{versionErrors.file}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">ملاحظات الإصدار</label>
                                <textarea
                                    value={versionData.change_notes}
                                    onChange={(e) => setVersionData('change_notes', e.target.value)}
                                    rows={3}
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
                                    {versionProcessing ? 'جارٍ الرفع...' : 'حفظ الإصدار'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Modal (admin only) */}
            {isAdmin && (
                <ShareModal
                    document={document}
                    shareableUsers={shareableUsers}
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                />
            )}
        </AppLayout>
    );
}