import { router } from '@inertiajs/react';
import { Share2, Trash2, UserPlus, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import type { DocumentItem, User } from '../types';

interface Props {
    document: DocumentItem;
    shareableUsers: User[];
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareModal({ document, shareableUsers, isOpen, onClose }: Props) {
    if (!isOpen) return null;

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [accessLevel, setAccessLevel] = useState<'view' | 'download' | 'edit'>('view');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleShare = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;

        setIsSubmitting(true);
        router.post(
            `/documents/${document.id}/access`,
            {
                user_id: selectedUserId,
                access_level: accessLevel,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedUserId('');
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const handleRevoke = (accessId: number) => {
        if (confirm('هل أنت متأكد من إلغاء مشاركة هذا المستند مع هذا المستخدم؟')) {
            router.delete(`/documents/${document.id}/access/${accessId}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                            مشاركة المستند وتحديد الصلاحيات
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Share Form */}
                    <form onSubmit={handleShare} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                        <label className="block text-xs font-semibold text-slate-300">
                            مشاركة مع مستخدم جديد:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                required
                            >
                                <option value="">اختر المستخدم...</option>
                                {shareableUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({(u.department as any)?.name ?? 'الإدارة'})
                                    </option>
                                ))}
                            </select>

                            <select
                                value={accessLevel}
                                onChange={(e) => setAccessLevel(e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="view">معاينة فقط (View)</option>
                                <option value="download">معاينة وتحميل (Download)</option>
                                <option value="edit">تحميل وتعديل إصدارات (Edit)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedUserId || isSubmitting}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? 'جارٍ الحفظ...' : 'منح الصلاحية الآن'}</span>
                        </button>
                    </form>

                    {/* Shared List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>المستخدمون الممنوحون حق الوصول حالياً:</span>
                        </h4>

                        <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
                            {document.access_list && document.access_list.length > 0 ? (
                                document.access_list.map((acc) => (
                                    <div key={acc.id} className="p-3 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-semibold text-slate-200">{acc.user?.name}</div>
                                            <div className="text-[10px] text-slate-400">
                                                الصلاحية:{' '}
                                                <span className="text-indigo-400 font-mono font-medium">
                                                    {acc.access_level === 'view'
                                                        ? 'معاينة'
                                                        : acc.access_level === 'download'
                                                        ? 'تحميل'
                                                        : 'تعديل ورفع إصدارات'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRevoke(acc.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                            title="إلغاء المشاركة"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-slate-500">
                                    المستند متاح حالياً فقط لموظفي القسم والمدير العام.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
