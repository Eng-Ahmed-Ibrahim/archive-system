import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Calendar,
    Check,
    FileCheck,
    FilePlus,
    FileText,
    Folder,
    Hash,
    Plus,
    RefreshCw,
    Shield,
    Tag as TagIcon,
    UploadCloud,
    X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import type { Category, Department, DocumentType, SharedProps } from '../../types';

interface Props {
    departments: Department[];
    categories: Category[];
    documentTypes: DocumentType[];
    allTags: string[];
    defaultDepartmentId?: number | null;
}

export default function DocumentCreate({
    departments,
    categories,
    documentTypes,
    allTags,
    defaultDepartmentId,
}: Props) {
    const { auth, flash, appName } = usePage<SharedProps>().props;


    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedTagInput, setSelectedTagInput] = useState('');
    const [tagsList, setTagsList] = useState<string[]>([]);

    const urlParams = new URLSearchParams(window.location.search);
    const initialCategoryId = urlParams.get('category_id') || (categories[0]?.id ? String(categories[0].id) : '');

    const generateRefNumber = () => {
        const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return `REF-${dateStr}-${rand}`;
    };

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        reference_no: generateRefNumber(),
        doc_date: new Date().toISOString().slice(0, 10),
        department_id: defaultDepartmentId ? String(defaultDepartmentId) : (departments[0]?.id ? String(departments[0].id) : ''),
        category_id: initialCategoryId,
        type_id: documentTypes[0]?.id ? String(documentTypes[0].id) : '',
        status: 'active',
        tags: [] as string[],
        file: null as File | null,
        change_notes: 'النسخة الأصلية الأولى',
    });
    const [selectedDepartment, setSelectedDepartment] = useState(data.department_id);

    const filteredCategories = categories.filter(
        (c) => String(c.department_id) === String(data.department_id)
    );
    const handleFileChange = (file: File | null) => {
        if (!file) return;
        setData('file', file);
        if (!data.title) {
            // Strip extension for title suggestion
            const suggestedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setData('title', suggestedTitle);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const addTag = (tagName: string) => {
        const trimmed = tagName.trim();
        if (trimmed && !tagsList.includes(trimmed)) {
            const nextTags = [...tagsList, trimmed];
            setTagsList(nextTags);
            setData('tags', nextTags);
            setSelectedTagInput('');
        }
    };

    const removeTag = (index: number) => {
        const nextTags = tagsList.filter((_, i) => i !== index);
        setTagsList(nextTags);
        setData('tags', nextTags);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/documents');
    };

    const formatBytes = (bytes: number) => {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    return (
        <AppLayout title="رفع ملف جديد">
            <Head title="رفع وأرشفة ملف جديد - سيستم الأرشيف" />

            {/* Header & Back link */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <FilePlus className="w-5 h-5 text-indigo-400" />
                        <span>رفع ملف جديد</span>
                    </h2>

                </div>

                <Link
                    href="/documents"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>العودة للمستندات</span>
                </Link>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Middle: File Dropzone & Notes (1 Col) */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Drag and Drop File Box */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                            الملف المرفق <span className="text-rose-400">*</span>
                        </label>

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all ${dragOver
                                ? 'border-indigo-500 bg-indigo-950/30'
                                : data.file
                                    ? 'border-emerald-500/60 bg-emerald-950/20'
                                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/60'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.svg,.txt"
                            />

                            {data.file ? (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                                        <FileCheck className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                                            {data.file.name}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono">
                                            {formatBytes(data.file.size)} • {data.file.type || 'ملف رقمي'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setData('file', null);
                                        }}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                                    >
                                        تغيير الملف
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                                        <UploadCloud className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="text-xs font-semibold text-slate-200">
                                        اسحب الملف وأفلته هنا أو اضغط للاختيار
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        يدعم PDF، الصور (JPG، PNG، SVG)، وExcel وWord (بحد أقصى 50MB)
                                    </p>
                                </div>
                            )}
                        </div>
                        {errors.file && (
                            <p className="text-[11px] text-rose-400">{errors.file}</p>
                        )}
                    </div>

                    {/* Change notes for version 1 */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-300">
                            ملاحظات الإصدار الأول
                        </label>
                        <textarea
                            value={data.change_notes}
                            onChange={(e) => setData('change_notes', e.target.value)}
                            rows={3}
                            placeholder="ملاحظات حول أصل الوثيقة أو ملابسات حفظها..."
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>


                </div>

                {/* Right: Metadata Form (2 Cols) */}
                <div className="lg:col-span-2 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span> بيانات الملف</span>
                    </h3>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-300">
                            عنوان المستند <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="مثال: عقد توريد خوادم سحابية للشركة 2026"
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                            required
                        />
                        {errors.title && (
                            <p className="text-[11px] text-rose-400">{errors.title}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Reference Number */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                                <span>الرقم المرجعي </span>
                                <button
                                    type="button"
                                    onClick={() => setData('reference_no', generateRefNumber())}
                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                                >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    توليد جديد
                                </button>
                            </label>
                            <div className="relative">
                                <Hash className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={data.reference_no}
                                    onChange={(e) => setData('reference_no', e.target.value)}
                                    placeholder="REF-2026-..."
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            {errors.reference_no && (
                                <p className="text-[11px] text-rose-400">{errors.reference_no}</p>
                            )}
                        </div>

                        {/* Document Date */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                تاريخ المستند <span className="text-rose-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="date"
                                    value={data.doc_date}
                                    onChange={(e) => setData('doc_date', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            {errors.doc_date && (
                                <p className="text-[11px] text-rose-400">{errors.doc_date}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Department */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                القسم التابع له <span className="text-rose-400">*</span>
                            </label>

                            <select
                                value={data.department_id}
                                onChange={(e) => {
                                    const departmentId = e.target.value;

                                    const departmentCategories = categories.filter(
                                        (c) => String(c.department_id) === String(departmentId)
                                    );

                                    setData((prev) => ({
                                        ...prev,
                                        department_id: departmentId,
                                        category_id: departmentCategories.length > 0 ? String(departmentCategories[0].id) : '',
                                    }));
                                }}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                required
                            >
                                <option value="">اختر القسم...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            {errors.department_id && (
                                <p className="text-[11px] text-rose-400">
                                    {errors.department_id}
                                </p>
                            )}
                        </div>
                        {/* Category */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                المجلد والتصنيف <span className="text-rose-400">*</span>
                            </label>

                            <select
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                                disabled={!data.department_id || filteredCategories.length === 0}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                                required
                            >
                                <option value="">
                                    {!data.department_id
                                        ? 'اختر القسم أولاً...'
                                        : filteredCategories.length === 0
                                            ? 'لا توجد مجلدات لهذا القسم'
                                            : 'اختر المجلد...'}
                                </option>

                                {filteredCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            {errors.category_id && (
                                <p className="text-[11px] text-rose-400">
                                    {errors.category_id}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                نوع المستند
                            </label>
                            <select
                                value={data.type_id}
                                onChange={(e) => setData('type_id', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">غير محدد</option>
                                {documentTypes.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                حالة المستند
                            </label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="active">ساري / نشط</option>
                                <option value="archived">مؤرشف</option>
                                <option value="draft">مسودة</option>
                            </select>
                        </div>
                    </div> */}



                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <Link
                            href="/documents"
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            إلغاء
                        </Link>

                        <button
                            type="submit"
                            disabled={processing || !data.file || !data.title}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all"
                        >
                            <FilePlus className="w-4 h-4" />
                            <span>{processing ? 'جارٍ رفع الوثيقة...' : 'حفظ وأرشفة الوثيقة'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
