import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Edit2,
    FileText,
    Folder,
    FolderTree,
    HardDrive,
    Lock,
    Plus,
    Shield,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import type { Department } from '../../types';

interface Props {
    departments: Department[];
    canManage: boolean;
}

export default function DepartmentsIndex({ departments, canManage }: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);

    // Create Form
    const {
        data: createData,
        setData: setCreateData,
        post: postCreate,
        processing: createProcessing,
        reset: resetCreate,
        errors: createErrors,
    } = useForm({
        name: '',
        code: '',
        description: '',
    });

    // Edit Form
    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        reset: resetEdit,
        errors: editErrors,
    } = useForm({
        name: '',
        code: '',
        description: '',
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/departments', {
            onSuccess: () => {
                setCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    const openEditModal = (dept: Department) => {
        setSelectedDept(dept);
        setEditData({
            name: dept.name,
            code: dept.code || '',
            description: dept.description || '',
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept) return;

        putEdit(`/departments/${selectedDept.id}`, {
            onSuccess: () => {
                setEditModalOpen(false);
                setSelectedDept(null);
                resetEdit();
            },
        });
    };

    const handleDelete = (dept: Department) => {
        if (confirm(`هل أنت متأكد من حذف قسم "${dept.name}"؟`)) {
            router.delete(`/departments/${dept.id}`);
        }
    };

    return (
        <AppLayout title="الاقسام">
            <Head title="الاقسام والمجلدات الرئيسية - سيستم الأرشيف" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                        <span>الاقسام </span>
                    </h2>
     
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>إضافة قسم جديد</span>
                    </button>
                )}
            </div>

            {/* Department Cards Grid (Windows Drive/Folder Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {departments.map((dept) => (
                    <div
                        key={dept.id}
                        className="group rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 p-6 shadow-xl flex flex-col justify-between space-y-5 transition-all"
                    >
                        <div className="space-y-4">
                            {/* Card Top */}
                            <div className="flex items-start justify-between">
                                <Link
                                    href={`/categories?department_id=${dept.id}`}
                                    className="flex items-start gap-3 flex-1 group-hover:text-indigo-300"
                                >
                                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-950 to-slate-900 border border-indigo-700/50 text-indigo-400 group-hover:scale-105 transition-transform shadow-md">
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                {dept.name}
                                            </h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                                                {dept.code || 'DEPT'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-2">
                                            {dept.description || 'لا يوجد وصف مضاف لهذا القسم.'}
                                        </p>
                                    </div>
                                </Link>

                                {canManage && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(dept)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                            title="تعديل بيانات القسم"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(dept)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                            title="حذف القسم"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center bg-slate-950/40 rounded-xl">
                                <div className="space-y-0.5">
                                    <div className="text-lg font-black text-white">{dept.documents_count || 0}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                        <FileText className="w-2.5 h-2.5 text-cyan-400" />
                                        <span>مستند</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <div className="text-lg font-black text-white">{dept.categories_count || 0}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                        <Folder className="w-2.5 h-2.5 text-amber-400" />
                                        <span>مجلد</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <div className="text-lg font-black text-white">{dept.users_count || 0}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                        <Users className="w-2.5 h-2.5 text-purple-400" />
                                        <span>موظف</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="flex items-center justify-between pt-2">
                            {dept.can_access ? (
                                <Link
                                    href={`/categories?department_id=${dept.id}`}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                                >
                                    <FolderTree className="w-3.5 h-3.5 text-amber-300" />
                                    <span>دخول القسم وتصفح مجلداته</span>
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                </Link>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>معزول عن صلاحياتك المباشرة</span>
                                </div>
                            )}

       
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Department Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">إضافة قسم إداري جديد</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اسم القسم <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createData.name}
                                    onChange={(e) => setCreateData('name', e.target.value)}
                                    placeholder="مثال: إدارة التسويق والعلاقات"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                                {createErrors.name && (
                                    <p className="text-[11px] text-rose-400">{createErrors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    رمز / كود القسم (Code)
                                </label>
                                <input
                                    type="text"
                                    value={createData.code}
                                    onChange={(e) => setCreateData('code', e.target.value.toUpperCase())}
                                    placeholder="MKT"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                                />
                                {createErrors.code && (
                                    <p className="text-[11px] text-rose-400">{createErrors.code}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    وصف القسم واختصاصه
                                </label>
                                <textarea
                                    value={createData.description}
                                    onChange={(e) => setCreateData('description', e.target.value)}
                                    rows={3}
                                    placeholder="وصف طبيعة عمل القسم والوثائق المعنية به..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProcessing || !createData.name.trim()}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {createProcessing ? 'جارٍ الإنشاء...' : 'إنشاء القسم'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Department Modal */}
            {editModalOpen && selectedDept && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">تعديل بيانات القسم</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اسم القسم <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData('name', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                                {editErrors.name && (
                                    <p className="text-[11px] text-rose-400">{editErrors.name}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    رمز / كود القسم (Code)
                                </label>
                                <input
                                    type="text"
                                    value={editData.code}
                                    onChange={(e) => setEditData('code', e.target.value.toUpperCase())}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                                />
                                {editErrors.code && (
                                    <p className="text-[11px] text-rose-400">{editErrors.code}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    وصف القسم واختصاصه
                                </label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={editProcessing || !editData.name.trim()}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {editProcessing ? 'جارٍ التحديث...' : 'حفظ التعديلات'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
