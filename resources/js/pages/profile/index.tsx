import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    Check,
    CheckCircle2,
    Eraser,
    FileImage,
    Layers,
    PenTool,
    Shield,
    Trash2,
    UploadCloud,
    User as UserIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import AppLayout from '../../layouts/AppLayout';
import type { SharedProps } from '../../types';

interface ProfileUser {
    id: number;
    name: string;
    email: string;
    department: string;
    department_id: number | null;
    roles: string[];
    order_num: number | null;
    has_signature: boolean;
    signature_url: string | null;
}

interface Props {
    profileUser: ProfileUser;
}

export default function ProfileIndex({ profileUser }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const signatureRef = useRef<SignatureCanvas>(null);

    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCanvasDirty, setIsCanvasDirty] = useState(false);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        signature: null as File | null,
        signature_base64: '' as string,
    });

    // Auto-scale canvas on open/mode switch
    useEffect(() => {
        if (mode !== 'draw') return;

        const timer = setTimeout(() => {
            const canvas = signatureRef.current?.getCanvas();
            if (!canvas) return;

            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            signatureRef.current?.clear();
            setIsCanvasDirty(false);
        }, 60);

        return () => clearTimeout(timer);
    }, [mode]);

    const handleClearCanvas = () => {
        signatureRef.current?.clear();
        setIsCanvasDirty(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveUploadedFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setUploadedFile(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'draw') {
            if (!signatureRef.current || signatureRef.current.isEmpty()) {
                alert('يرجى رسم التوقيع أولاً قبل الحفظ.');
                return;
            }
            const base64 = signatureRef.current.toDataURL('image/png');
            transform(() => ({
                signature: null,
                signature_base64: base64,
            }));
        } else {
            if (!uploadedFile) {
                alert('يرجى اختيار صورة التوقيع أولاً.');
                return;
            }
            transform(() => ({
                signature: uploadedFile,
                signature_base64: '',
            }));
        }

        post('/profile/signature', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                handleClearCanvas();
                handleRemoveUploadedFile();
            },
        });
    };

    const handleDeleteCurrentSignature = () => {
        if (confirm('هل أنت متأكد من رغبتك في حذف توقيعك الإلكتروني الحالي؟')) {
            router.delete('/profile/signature', { preserveScroll: true });
        }
    };

    return (
        <AppLayout title="الملف الشخصي  ">

            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header banner */}
                <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-white border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-500/20">
                            {profileUser.name.charAt(0)}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                {profileUser.name}
                                {profileUser.order_num && (
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                                        ترتيب: #{profileUser.order_num}
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-500 font-mono">{profileUser.email}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    <Building2 className="w-3 h-3 text-indigo-600" />
                                    {profileUser.department}
                                </span>
                                {profileUser.roles.map((r, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold"
                                    >
                                        <Shield className="w-3 h-3 text-indigo-600" />
                                        {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {profileUser.has_signature ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>التوقيع الإلكتروني مفعّل ومحفوظ</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>لم يتم تسجيل توقيع إلكتروني بعد</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* User Info Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
                                <UserIcon className="w-4 h-4 text-indigo-600" />
                                معلومات الحساب
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-500 block mb-0.5">الاسم بالكامل</span>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold">
                                        {profileUser.name}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-0.5">البريد الإلكتروني</span>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono">
                                        {profileUser.email}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-500 block mb-0.5">القسم التابع له</span>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center gap-1.5 font-medium">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                        {profileUser.department}
                                    </div>
                                </div>

                                {profileUser.order_num && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">الترتيب الوظيفي داخل القسم</span>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-indigo-700 font-mono font-bold">
                                            #{profileUser.order_num}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current signature card */}
                        {profileUser.has_signature && profileUser.signature_url && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                                    <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        توقيعك الحالي المعتمد
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={handleDeleteCurrentSignature}
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                                        title="حذف التوقيع الحالي"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-4 bg-white rounded-xl shadow-inner flex items-center justify-center min-h-[120px] border border-slate-200">
                                    <img
                                        src={profileUser.signature_url}
                                        alt="توقيعك الحالي"
                                        className="max-h-24 max-w-full object-contain"
                                    />
                                </div>

                                <p className="text-[11px] text-slate-500 text-center">
                                    هذا التوقيع يُستخدم لاعتماد المستندات المعاملة وتحويلها إلكترونياً.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Signature Editor Column */}
                    <div className="lg:col-span-8">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <PenTool className="w-5 h-5 text-indigo-600" />
                                    {profileUser.has_signature ? 'تحديث أو استبدال التوقيع الإلكتروني' : 'تسجيل التوقيع الإلكتروني'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    يمكنك رسم توقيعك مباشرة بالقلم على الشاشة أو رفع صورة التوقيع الشفافة (PNG).
                                </p>
                            </div>

                            {/* Mode switcher tabs */}
                            <div className="flex rounded-xl bg-slate-100 border border-slate-200 p-1 gap-1 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setMode('draw')}
                                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                        mode === 'draw'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <PenTool className="w-4 h-4" />
                                    <span>رسم التوقيع بالقلم</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('upload')}
                                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                        mode === 'upload'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <FileImage className="w-4 h-4" />
                                    <span>رفع صورة التوقيع</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'draw' ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>ارسم توقيعك داخل المربع الأبيض أدناه:</span>
                                            <button
                                                type="button"
                                                onClick={handleClearCanvas}
                                                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium transition-colors"
                                            >
                                                <Eraser className="w-3.5 h-3.5" />
                                                <span>مسح اللوحة</span>
                                            </button>
                                        </div>

                                        <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2 shadow-inner overflow-hidden">
                                            <SignatureCanvas
                                                ref={signatureRef}
                                                penColor="#0f172a"
                                                velocityFilterWeight={0.7}
                                                minWidth={1.2}
                                                maxWidth={2.8}
                                                onBegin={() => setIsCanvasDirty(true)}
                                                canvasProps={{
                                                    className: 'w-full h-56 rounded-xl cursor-crosshair touch-none',
                                                }}
                                            />
                                            <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 pointer-events-none select-none">
                                                منطقة التوقيع الإلكتروني
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!previewUrl ? (
                                            <label className="flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 cursor-pointer p-6 transition-colors">
                                                <UploadCloud className="w-10 h-10 text-indigo-600 mb-2" />
                                                <span className="text-xs font-semibold text-slate-700">
                                                    انقر لاختيار ملف التوقيع أو اسحبه هنا
                                                </span>
                                                <span className="text-[11px] text-slate-500 mt-1">
                                                    يُفضل صورة بخلفية شفافة (PNG, JPG, WEBP) بحد أقصى 5MB
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span>معاينة الصورة المختارة:</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveUploadedFile}
                                                        className="text-rose-600 hover:text-rose-700 font-medium"
                                                    >
                                                        اختيار صورة أخرى
                                                    </button>
                                                </div>
                                                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-center min-h-[180px]">
                                                    <img
                                                        src={previewUrl}
                                                        alt="معاينة التوقيع المرفوع"
                                                        className="max-h-40 max-w-full object-contain"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {errors.signature && (
                                    <p className="text-xs text-rose-600">{errors.signature}</p>
                                )}

                                <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>{processing ? 'جارٍ حفظ التوقيع...' : 'حفظ واعتماد التوقيع'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}