import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    FilePlus,
    FileText,
    Filter,
    RefreshCw,
    Search,
    Tag as TagIcon,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import DocumentTable from '../../components/DocumentTable';
import FilePreviewModal from '../../components/FilePreviewModal';
import Pagination from '../../components/Pagination';
import AppLayout from '../../layouts/AppLayout';
import type { Category, Department, DocumentItem, DocumentType, PaginatedData, SharedProps, Tag } from '../../types';

interface Props {
    documents: PaginatedData<DocumentItem>;
    filters: {
        search?: string;
        department_id?: string;
        category_id?: string;
        type_id?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        tag?: string;
    };
    departments: Department[];
    categories: Category[];
    documentTypes: DocumentType[];
    tags: Tag[];
}

export default function DocumentsIndex({
    documents,
    filters,
    departments,
    categories,
    documentTypes,
    tags,
}: Props) {
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');
    const [typeId, setTypeId] = useState(filters.type_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [selectedTag, setSelectedTag] = useState(filters.tag || '');
    const [showFilters, setShowFilters] = useState(false);
    const { auth, flash, appName } = usePage<SharedProps>().props;

    const applyFilters = () => {
        router.get('/documents', {
            search: search.trim() || undefined,
            department_id: departmentId || undefined,
            category_id: categoryId || undefined,
            type_id: typeId || undefined,
            status: status || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            tag: selectedTag || undefined,
        }, { preserveState: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const clearFilters = () => {
        setSearch('');
        setDepartmentId('');
        setCategoryId('');
        setTypeId('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
        setSelectedTag('');
        router.get('/documents');
    };

    const hasActiveFilters = !!(
        filters.search ||
        filters.department_id ||
        filters.category_id ||
        filters.type_id ||
        filters.status ||
        filters.date_from ||
        filters.date_to ||
        filters.tag
    );

    return (
        <AppLayout title="الأرشيف والمستندات">
            <Head title="الأرشيف والمستندات - سيستم الأرشيف" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <span>جميع الملفات</span>
                    </h2>

                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow transition-colors ${showFilters || hasActiveFilters
                            ? 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span>الفلاتر المتقدمة</span>
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                    </button>
                    {['admin','archivist'].some((role) => auth.user.roles?.includes(role)) && (
                        <Link
                            href="/documents/create"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                        >
                            <FilePlus className="w-4 h-4" />
                            <span>رفع ملف جديد</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث بالعنوان، أو الرقم المرجعي، أو الوسم..."
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow"
                    >
                        بحث
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                            title="إلغاء جميع الفلاتر"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                </form>

                {/* Extended Filters Drawer */}
                {showFilters && (
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                            {['admin'].some((role) => auth.user.roles?.includes(role)) && (

                                <>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-400">القسم التنظيمي</label>
                                        <select
                                            value={departmentId}
                                            onChange={(e) => setDepartmentId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">كافة الأقسام</option>
                                            {departments.map((d) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-400">المجلد والتصنيف</label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">كافة المجلدات</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>

                            )}
                        </div>

                        {/* Date Range & Tags */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-400">من تاريخ</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-400">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>


                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                            >
                                مسح الفلاتر
                            </button>
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
                            >
                                تطبيق التصفية
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Table */}
            <DocumentTable
                documents={documents.data}
                onPreview={(doc) => setPreviewDoc(doc)}
            />

            {/* Pagination */}
            <Pagination links={documents.links} />

            {/* Preview Modal */}
            <FilePreviewModal
                document={previewDoc}
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </AppLayout>
    );
}
