import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowRight,
    ArrowUpFromLine,
    Building2,
    Calendar,
    FileCheck,
    FilePlus,
    FileText,
    Hash,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    UploadCloud,
    Users,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import type { Category, Department } from '../../types';

interface Subject {
    id: number;
    department_id: number;
    name: string;
}

interface RecipientUser {
    id: number;
    name: string;
    order_num: number | null;
}

interface RecipientDepartment {
    id: number;
    name: string;
    users: RecipientUser[];
}

interface RecipientBlock {
    department_id: string;
    user_ids: number[];
}

interface Props {
    departments: Department[];
    categories: Category[];
    subjects: Subject[];
    defaultDepartmentId?: number | null;
    recipientDepartments: RecipientDepartment[];
}

const inputCls =
    'w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500';

export default function DocumentCreate({
    departments,
    categories,
    subjects,
    defaultDepartmentId,
    recipientDepartments,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const urlParams = new URLSearchParams(window.location.search);
    const initialCategoryId = urlParams.get('category_id') || (categories[0]?.id ? String(categories[0].id) : '');

    const generateRefNumber = () => `${Math.floor(Math.random() * 1000000)}`;

    const initialDepartmentId = defaultDepartmentId
        ? String(defaultDepartmentId)
        : departments[0]?.id
        ? String(departments[0].id)
        : '';

    // تصفية أولية للمواضيع والفئات بناءً على القسم الافتراضي
    const initialFilteredSubjects = subjects.filter((s) => String(s.department_id) === initialDepartmentId);
    const initialFilteredCategories = categories.filter((c) => String(c.department_id) === initialDepartmentId);

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        subject_id: initialFilteredSubjects[0]?.id ? String(initialFilteredSubjects[0].id) : '',
        reference_no: generateRefNumber(),
        doc_date: new Date().toISOString().slice(0, 10),
        direction: 'incoming' as 'incoming' | 'outgoing',
        department_id: initialDepartmentId,
        category_id: initialCategoryId,
        file: null as File | null,
        comment: '',
        recipients: [] as RecipientBlock[],
    });

    const errs = errors as Record<string, string>;

    const filteredCategories = categories.filter((c) => String(c.department_id) === String(data.department_id));
    const filteredSubjects = subjects.filter((s) => String(s.department_id) === String(data.department_id));

    // ---------- File ----------
    const handleFileChange = (file: File | null) => {
        if (!file) return;
        setData((prev) => ({
            ...prev,
            file,
            title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        }));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    // ---------- Recipients ----------
    const usedDepartmentIds = data.recipients.map((r) => r.department_id).filter(Boolean);
    const canAddBlock = data.recipients.length < recipientDepartments.length;

    const addBlock = () => {
        setData((prev) => ({
            ...prev,
            recipients: [...prev.recipients, { department_id: '', user_ids: [] }],
        }));
    };

    const removeBlock = (index: number) => {
        setData((prev) => ({
            ...prev,
            recipients: prev.recipients.filter((_, i) => i !== index),
        }));
    };

    const changeBlockDepartment = (index: number, departmentId: string) => {
        setData((prev) => ({
            ...prev,
            recipients: prev.recipients.map((r, i) =>
                i === index ? { department_id: departmentId, user_ids: [] } : r,
            ),
        }));
    };

    const toggleBlockUser = (index: number, userId: number) => {
        setData((prev) => ({
            ...prev,
            recipients: prev.recipients.map((r, i) => {
                if (i !== index) return r;
                const exists = r.user_ids.includes(userId);
                return {
                    ...r,
                    user_ids: exists ? r.user_ids.filter((id) => id !== userId) : [...r.user_ids, userId],
                };
            }),
        }));
    };

    const toggleAllBlockUsers = (index: number, users: RecipientUser[]) => {
        setData((prev) => ({
            ...prev,
            recipients: prev.recipients.map((r, i) => {
                if (i !== index) return r;
                const allSelected = users.length > 0 && r.user_ids.length === users.length;
                return { ...r, user_ids: allSelected ? [] : users.map((u) => u.id) };
            }),
        }));
    };

    const totalRecipients = data.recipients.reduce((sum, r) => sum + r.user_ids.length, 0);
    const hasIncompleteBlock = data.recipients.some((r) => !r.department_id || r.user_ids.length === 0);

    // ---------- Submit ----------
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/documents', { forceFormData: true });
    };

    const formatBytes = (bytes: number) => {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    return (
        <AppLayout title="رفع ملف جديد">
            <Head title="رفع وأرشفة ملف جديد - سيستم الأرشيف" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <FilePlus className="w-5 h-5 text-indigo-400" />
                    <span>رفع ملف جديد</span>
                </h2>

                <Link
                    href="/documents"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>العودة للمستندات</span>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: File & Comment */}
                <div className="lg:col-span-1 space-y-4">
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
                            className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all ${
                                dragOver
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
                                            {formatBytes(data.file.size)} - {data.file.type || 'ملف رقمي'}
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
                        {errors.file && <p className="text-[11px] text-rose-400">{errors.file}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-300">تعليق على الملف (اختياري)</label>
                        <textarea
                            value={data.comment}
                            onChange={(e) => setData('comment', e.target.value)}
                            rows={3}
                            placeholder="اكتب تعليقاً يظهر للمستلمين مع الملف..."
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        {errors.comment && <p className="text-[11px] text-rose-400">{errors.comment}</p>}
                    </div>
                </div>

                {/* Right: Metadata + Recipients */}
                <div className="lg:col-span-2 space-y-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>بيانات الملف</span>
                    </h3>

                    {/* Direction */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                            نوع المستند <span className="text-rose-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setData('direction', 'incoming')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-colors ${
                                    data.direction === 'incoming'
                                        ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300'
                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                <span>وارد</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setData('direction', 'outgoing')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-colors ${
                                    data.direction === 'outgoing'
                                        ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                <ArrowUpFromLine className="w-4 h-4" />
                                <span>صادر</span>
                            </button>
                        </div>
                        {errors.direction && <p className="text-[11px] text-rose-400">{errors.direction}</p>}
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-300">
                            عنوان المستند <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="أسم الملف"
                            className={inputCls}
                            required
                        />
                        {errors.title && <p className="text-[11px] text-rose-400">{errors.title}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Reference */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                                <span>الرقم المرجعي</span>
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
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            {errors.reference_no && <p className="text-[11px] text-rose-400">{errors.reference_no}</p>}
                        </div>

                        {/* Date */}
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
                            {errors.doc_date && <p className="text-[11px] text-rose-400">{errors.doc_date}</p>}
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
                                        (c) => String(c.department_id) === String(departmentId),
                                    );
                                    const departmentSubjects = subjects.filter(
                                        (s) => String(s.department_id) === String(departmentId),
                                    );

                                    setData((prev) => ({
                                        ...prev,
                                        department_id: departmentId,
                                        category_id: departmentCategories.length > 0 ? String(departmentCategories[0].id) : '',
                                        subject_id: departmentSubjects.length > 0 ? String(departmentSubjects[0].id) : '',
                                    }));
                                }}
                                className={inputCls}
                                required
                            >
                                <option value="">اختر القسم...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            {errors.department_id && <p className="text-[11px] text-rose-400">{errors.department_id}</p>}
                        </div>

                        {/* Subject */}
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                موضوع المستند <span className="text-rose-400">*</span>
                            </label>
                            <select
                                value={data.subject_id}
                                onChange={(e) => setData('subject_id', e.target.value)}
                                disabled={!data.department_id || filteredSubjects.length === 0}
                                className={`${inputCls} disabled:opacity-40`}
                                required
                            >
                                <option value="">
                                    {!data.department_id
                                        ? 'اختر القسم أولاً...'
                                        : filteredSubjects.length === 0
                                        ? 'لا توجد مواضيع لهذا القسم'
                                        : 'اختر الموضوع...'}
                                </option>
                                {filteredSubjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name}
                                    </option>
                                ))}
                            </select>
                            {errors.subject_id && <p className="text-[11px] text-rose-400">{errors.subject_id}</p>}
                        </div>
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
                            className={`${inputCls} disabled:opacity-40`}
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
                        {errors.category_id && <p className="text-[11px] text-rose-400">{errors.category_id}</p>}
                    </div>

                    {/* Recipients */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <Send className="w-4 h-4 text-indigo-400" />
                                <span>إرسال إلى</span>
                                {totalRecipients > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                                        {totalRecipients} موظف
                                    </span>
                                )}
                            </h4>

                            <button
                                type="button"
                                onClick={addBlock}
                                disabled={!canAddBlock}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-40"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة قسم</span>
                            </button>
                        </div>

                        {data.recipients.length === 0 && (
                            <p className="text-[11px] text-slate-500">
                                لم يتم اختيار مستلمين. اضغط «إضافة قسم» لإرسال المستند لموظفين بعينهم.
                            </p>
                        )}

                        {data.recipients.map((block, index) => {
                            const dept = recipientDepartments.find((d) => String(d.id) === block.department_id);
                            const users = dept?.users ?? [];
                            const allSelected = users.length > 0 && block.user_ids.length === users.length;
                            const blockError =
                                errs[`recipients.${index}.user_ids`] || errs[`recipients.${index}.department_id`];

                            return (
                                <div
                                    key={index}
                                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <select
                                            value={block.department_id}
                                            onChange={(e) => changeBlockDepartment(index, e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="">اختر القسم...</option>
                                            {recipientDepartments
                                                .filter(
                                                    (d) =>
                                                        String(d.id) === block.department_id ||
                                                        !usedDepartmentIds.includes(String(d.id)),
                                                )
                                                .map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name}
                                                    </option>
                                                ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => removeBlock(index)}
                                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors shrink-0"
                                            title="إزالة القسم"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {block.department_id && (
                                        <>
                                            {users.length === 0 ? (
                                                <p className="text-[11px] text-amber-400">
                                                    لا يوجد موظفون نشطون في هذا القسم.
                                                </p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                           الاعضاء بالترتيب
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAllBlockUsers(index, users)}
                                                            className="text-cyan-400 hover:text-cyan-300"
                                                        >
                                                            {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {users.map((u) => {
                                                            const checked = block.user_ids.includes(u.id);
                                                            return (
                                                                <label
                                                                    key={u.id}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-colors ${
                                                                        checked
                                                                            ? 'bg-indigo-950/50 border-indigo-600 text-white'
                                                                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleBlockUser(index, u.id)}
                                                                        className="accent-indigo-500"
                                                                    />
                                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                                                        #{u.order_num ?? '-'}
                                                                    </span>
                                                                    <span className="truncate">{u.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {blockError && <p className="text-[11px] text-rose-400">{blockError}</p>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <Link
                            href="/documents"
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            إلغاء
                        </Link>

                        <button
                            type="submit"
                            disabled={processing || !data.file || !data.title || !data.subject_id || hasIncompleteBlock}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all"
                        >
                            <FilePlus className="w-4 h-4" />
                            <span>{processing ? 'جارٍ رفع الوثيقة...' : totalRecipients > 0 ? 'حفظ وإرسال' : 'حفظ'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}