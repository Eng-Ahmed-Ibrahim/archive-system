import { Head, router, useForm } from '@inertiajs/react';
import { BookOpen, Building2, Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import AppLayout from '../../layouts/AppLayout';
import type { Department, PaginatedData } from '../../types';

interface SubjectItem {
    id: number;
    name: string;
    department_id: number;
    created_at?: string;
    department?: Pick<Department, 'id' | 'name'> | null;
}

interface Props {
    subjects: PaginatedData<SubjectItem>;
    filters: {
        search?: string;
        department_id?: string;
    };
    departments: Pick<Department, 'id' | 'name'>[];
}

export default function SubjectsIndex({ subjects, filters, departments }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SubjectItem | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        department_id: '',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/subjects',
            {
                search: search.trim() || undefined,
                department_id: departmentId || undefined,
            },
            { preserveState: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setDepartmentId('');
        router.get('/subjects');
    };

    const openCreate = () => {
        setEditing(null);
        reset();
        clearErrors();
        setModalOpen(true);
    };

    const openEdit = (subject: SubjectItem) => {
        setEditing(subject);
        clearErrors();
        setData({
            name: subject.name,
            department_id: String(subject.department_id),
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        };

        if (editing) {
            put(`/subjects/${editing.id}`, options);
        } else {
            post('/subjects', options);
        }
    };

    const handleDelete = (subject: SubjectItem) => {
        if (confirm(`هل أنت متأكد من حذف الموضوع "${subject.name}"؟`)) {
            router.delete(`/subjects/${subject.id}`, { preserveScroll: true });
        }
    };

    const hasFilters = !!(filters.search || filters.department_id);

    return (
        <AppLayout title="إدارة المواضيع">
            <Head title="إدارة المواضيع - سيستم الأرشيف" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>إدارة المواضيع</span>
                </h2>

                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>إضافة موضوع جديد</span>
                </button>
            </div>

            {/* Filters */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث باسم الموضوع..."
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">كافة الأقسام</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2 flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                        >
                            بحث
                        </button>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs border border-slate-700"
                                title="مسح الفلاتر"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/80">
                            <th className="py-3.5 px-4">#</th>
                            <th className="py-3.5 px-3">اسم الموضوع</th>
                            <th className="py-3.5 px-3">القسم التابع له</th>
                            <th className="py-3.5 px-3">تاريخ الإضافة</th>
                            <th className="py-3.5 px-3 text-left">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {subjects.data.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 font-mono">{s.id}</td>

                                <td className="py-3.5 px-3 font-bold text-slate-100">{s.name}</td>

                                <td className="py-3.5 px-3">
                                    <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 inline-flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-indigo-400" />
                                        <span>{s.department?.name ?? '-'}</span>
                                    </span>
                                </td>

                                <td className="py-3.5 px-3 text-slate-400 text-[11px] font-mono">
                                    {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}
                                </td>

                                <td className="py-3.5 px-3 text-left">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(s)}
                                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                            title="تعديل"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(s)}
                                            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {subjects.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                                    لا توجد مواضيع مطابقة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination links={subjects.links} />

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {editing ? (
                                    <Edit2 className="w-5 h-5 text-indigo-400" />
                                ) : (
                                    <Plus className="w-5 h-5 text-indigo-400" />
                                )}
                                <h3 className="text-sm font-bold text-white">
                                    {editing ? 'تعديل الموضوع' : 'إضافة موضوع جديد'}
                                </h3>
                            </div>
                            <button type="button" onClick={closeModal} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اسم الموضوع <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="مثال: عقود التوريد"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                    autoFocus
                                />
                                {errors.name && <p className="text-[11px] text-rose-400">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    القسم <span className="text-rose-400">*</span>
                                </label>
                                <select
                                    value={data.department_id}
                                    onChange={(e) => setData('department_id', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                                    <p className="text-[11px] text-rose-400">{errors.department_id}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {processing ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الموضوع'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}   