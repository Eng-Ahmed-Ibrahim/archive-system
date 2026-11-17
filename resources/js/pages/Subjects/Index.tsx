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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <span>إدارة المواضيع</span>
                </h2>

                <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>إضافة موضوع جديد</span>
                </button>
            </div>

            {/* Filters */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm mt-6">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث باسم الموضوع..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <select
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
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
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        >
                            بحث
                        </button>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 text-xs border border-slate-200 shadow-2xs transition-colors"
                                title="مسح الفلاتر"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mt-6">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                            <th className="py-3.5 px-4">#</th>
                            <th className="py-3.5 px-3">اسم الموضوع</th>
                            <th className="py-3.5 px-3">القسم التابع له</th>
                            <th className="py-3.5 px-3">تاريخ الإضافة</th>
                            <th className="py-3.5 px-3 text-left">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {subjects.data.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 text-slate-400 font-mono">{s.id}</td>

                                <td className="py-3.5 px-3 font-bold text-slate-900">{s.name}</td>

                                <td className="py-3.5 px-3">
                                    <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1 shadow-2xs">
                                        <Building2 className="w-3 h-3 text-indigo-600" />
                                        <span>{s.department?.name ?? '-'}</span>
                                    </span>
                                </td>

                                <td className="py-3.5 px-3 text-slate-500 text-[11px] font-mono">
                                    {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}
                                </td>

                                <td className="py-3.5 px-3 text-left">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(s)}
                                            className="p-1.5 rounded-lg bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
                                            title="تعديل"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(s)}
                                            className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shadow-2xs"
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
                                <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                                    لا توجد مواضيع مطابقة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4">
                <Pagination links={subjects.links} />
            </div>

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                {editing ? (
                                    <Edit2 className="w-5 h-5 text-indigo-600" />
                                ) : (
                                    <Plus className="w-5 h-5 text-indigo-600" />
                                )}
                                <h3 className="text-sm font-bold text-slate-900">
                                    {editing ? 'تعديل الموضوع' : 'إضافة موضوع جديد'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                    اسم الموضوع <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="مثال: عقود التوريد"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                                    required
                                    autoFocus
                                />
                                {errors.name && <p className="text-[11px] text-rose-600">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                    القسم <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.department_id}
                                    onChange={(e) => setData('department_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
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
                                    <p className="text-[11px] text-rose-600">{errors.department_id}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
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