import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Edit2,
    FilePlus,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    HardDrive,
    Layers,
    ListTree,
    MoreVertical,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import CategoryTree from '../../components/CategoryTree';
import DocumentTable from '../../components/DocumentTable';
import FilePreviewModal from '../../components/FilePreviewModal';
import Pagination from '../../components/Pagination';
import AppLayout from '../../layouts/AppLayout';
import type { Category, Department, DocumentItem, PaginatedData, SharedProps } from '../../types';

interface BreadcrumbItem {
    id: number;
    name: string;
}

interface Props {
    categories: Category[];
    selectedCategory: Category | null;
    currentDepartment: Department | null;
    subfolders: Category[];
    breadcrumbs: BreadcrumbItem[];
    includeSubfolders: boolean;
    documents: PaginatedData<DocumentItem>;
    departments: Department[];
    canManage: boolean;
}

export default function CategoriesIndex({
    categories,
    selectedCategory,
    currentDepartment,
    subfolders,
    breadcrumbs,
    includeSubfolders,
    documents,
    departments,
    canManage,
}: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const { auth, flash, appName } = usePage<SharedProps>().props;

    // Modals
    const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
    const [editFolderModalOpen, setEditFolderModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
        parent_id: selectedCategory ? String(selectedCategory.id) : '',
        department_id: currentDepartment ? String(currentDepartment.id) : (selectedCategory?.department_id ? String(selectedCategory.department_id) : ''),
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
        parent_id: '',
        department_id: '',
        description: '',
    });

    const handleSelectCategory = (cat: Category) => {
        router.get('/categories', {
            category_id: cat.id,
            department_id: currentDepartment?.id || cat.department_id || undefined,
            include_subfolders: includeSubfolders ? 1 : 0,
        }, { preserveState: true });
    };

    const handleDepartmentChange = (deptId: string) => {
        router.get('/categories', {
            department_id: deptId || undefined,
            include_subfolders: includeSubfolders ? 1 : 0,
        });
    };

    const handleToggleSubfolders = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        router.get('/categories', {
            category_id: selectedCategory?.id,
            department_id: currentDepartment?.id,
            include_subfolders: checked ? 1 : 0,
        }, { preserveState: true });
    };

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/categories', {
            onSuccess: () => {
                setCreateFolderModalOpen(false);
                resetCreate();
            },
        });
    };

    const openCreateModal = (parentId?: number) => {
        setCreateData({
            name: '',
            parent_id: parentId ? String(parentId) : (selectedCategory ? String(selectedCategory.id) : ''),
            department_id: currentDepartment ? String(currentDepartment.id) : (selectedCategory?.department_id ? String(selectedCategory.department_id) : ''),
            description: '',
        });
        setCreateFolderModalOpen(true);
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setEditData({
            name: cat.name,
            parent_id: cat.parent_id ? String(cat.parent_id) : '',
            department_id: cat.department_id ? String(cat.department_id) : '',
            description: cat.description || '',
        });
        setEditFolderModalOpen(true);
    };

    const handleEditFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;

        putEdit(`/categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditFolderModalOpen(false);
                setEditingCategory(null);
                resetEdit();
            },
        });
    };

    const handleDeleteFolder = (cat: Category) => {
        if (confirm(`هل أنت متأكد من حذف المجلد "${cat.name}"؟`)) {
            router.delete(`/categories/${cat.id}`);
        }
    };

    return (
        <AppLayout title="مستعرض المجلدات والأقسام">
            <Head title="مستعرض المجلدات - سيستم الأرشيف" />

            {/* Windows-style Explorer Address & Controls Bar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl space-y-3">
                {/* Top Controls: Department Filter + Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    { ['admin'].some((role) => auth.user.roles?.includes(role)) && (

                        <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300">القسم:</span>
                        <select
                            value={currentDepartment?.id || ''}
                            onChange={(e) => handleDepartmentChange(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                        >
                            <option value="">كافة الأقسام والمجلدات العامة</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    )}

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => openCreateModal()}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                                <span>مجلد جديد</span>
                            </button>
                        )}

                        {selectedCategory && ['admin', 'archivist'].some((role) => auth.user.roles?.includes(role)) && (
                            <Link
                                href={`/documents/create?category_id=${selectedCategory.id}&department_id=${selectedCategory.department_id || currentDepartment?.id || ''}`}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold shadow transition-colors"
                            >
                                <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
                                <span>رفع مستند هنا</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Windows Explorer Breadcrumb Path */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto py-1">
                    <Link
                        href="/departments"
                        className="px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-white flex items-center gap-1 transition-colors shrink-0"
                    >
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>الأقسام</span>
                    </Link>

                    {currentDepartment && (
                        <>
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <Link
                                href={`/categories?department_id=${currentDepartment.id}`}
                                className="px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors shrink-0 font-semibold text-slate-200"
                            >
                                {currentDepartment.name}
                            </Link>
                        </>
                    )}

                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id}>
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <button
                                type="button"
                                onClick={() => router.get('/categories', { category_id: crumb.id, department_id: currentDepartment?.id })}
                                className={`px-2 py-1 rounded-lg transition-colors shrink-0 font-medium ${idx === breadcrumbs.length - 1
                                        ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/50'
                                        : 'hover:bg-slate-800 hover:text-white text-slate-300'
                                    }`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Explorer: Tree Sidebar + Subfolders & Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Tree Explorer (1 Col) */}
                <div className="lg:col-span-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Folder className="w-4 h-4 text-amber-400" />
                            <span> المجلدات</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                            {categories.length} مجلد
                        </span>
                    </div>

                    <CategoryTree
                        categories={categories}
                        selectedCategoryId={selectedCategory?.id}
                        onSelectCategory={handleSelectCategory}
                        onNewFolderClick={(parentId) => openCreateModal(parentId)}
                        canManageFolders={canManage}
                    />
                </div>

                {/* Right Folder Contents View (3 Cols) */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Active Folder Header Banner with Edit/Delete Controls */}
                    {selectedCategory && (
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="w-6 h-6 text-amber-400" />
                                    <h3 className="text-base sm:text-lg font-bold text-white">
                                        {selectedCategory.name}
                                    </h3>
                                    {selectedCategory.department && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                            {selectedCategory.department.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">
                                    {selectedCategory.description || 'لا يوجد وصف مضاف لهذا المجلد.'}
                                </p>
                            </div>

                            {/* Actions on Active Folder */}
                            <div className="flex items-center gap-2">
                                {canManage && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(selectedCategory)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                                            title="تعديل هذا المجلد"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            <span>تعديل</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteFolder(selectedCategory)}
                                            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                                            title="حذف هذا المجلد"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Subfolders Grid (Windows Folder Tiles Style) */}
                    {subfolders && subfolders.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                                    <span>المجلدات الفرعية ({subfolders.length}):</span>
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {subfolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        onClick={() => handleSelectCategory(folder)}
                                        className="group relative p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/90 hover:border-amber-400/50 cursor-pointer shadow-lg transition-all flex flex-col justify-between space-y-2"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-700/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                                                <Folder className="w-5 h-5" />
                                            </div>

                                            {canManage && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(folder)}
                                                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                                                        title="تعديل المجلد"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFolder(folder)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                                                        title="حذف المجلد"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                                                {folder.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {folder.documents_count || 0} مستند
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents Table in Current Folder */}
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span>المستندات في هذا المجلد:</span>
                        </div>

                        {documents && documents.data ? (
                            <>
                                <DocumentTable
                                    documents={documents.data}
                                    onPreview={(doc) => setPreviewDoc(doc)}
                                />
                                <Pagination links={documents.links} />
                            </>
                        ) : (
                            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-12 text-center text-slate-500 text-xs">
                                اختر مجلداً لاستعراض مستنداته.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Create Folder */}
            {createFolderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">إنشاء مجلد تصنيف جديد</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateFolderModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اسم المجلد <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createData.name}
                                    onChange={(e) => setCreateData('name', e.target.value)}
                                    placeholder="مثال: عقود الصيانة والخدمات"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                                {createErrors.name && (
                                    <p className="text-[11px] text-rose-400">{createErrors.name}</p>
                                )}
                            </div>



                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    وصف المجلد
                                </label>
                                <textarea
                                    value={createData.description}
                                    onChange={(e) => setCreateData('description', e.target.value)}
                                    rows={2}
                                    placeholder="وصف مختصر لمحتويات المجلد..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCreateFolderModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProcessing || !createData.name.trim()}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {createProcessing ? 'جارٍ الإنشاء...' : 'إنشاء المجلد'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Folder */}
            {editFolderModalOpen && editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">تعديل بيانات المجلد</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditFolderModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditFolder} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    اسم المجلد <span className="text-rose-400">*</span>
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
                                    القسم التابع له المجلد
                                </label>
                                <select
                                    value={editData.department_id}
                                    onChange={(e) => setEditData('department_id', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">عام (كافة الأقسام)</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>



                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    وصف المجلد
                                </label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditFolderModalOpen(false)}
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

            {/* File Preview Modal */}
            <FilePreviewModal
                document={previewDoc}
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </AppLayout>
    );
}
