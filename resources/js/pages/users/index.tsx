import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CheckCircle2,
    Edit2,
    FileText,
    KeyRound,
    Lock,
    Mail,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import Pagination from '../../components/Pagination';
import AppLayout from '../../layouts/AppLayout';
import type { Department, PaginatedData, User } from '../../types';

interface RoleItem {
    id: number;
    name: string;
    display_name: string;
}

interface UserItem extends User {
    status: 'active' | 'inactive';
    uploaded_documents_count?: number;
    created_at?: string;
    department?: Department | null;
    roles?: any[];
}

interface Props {
    users: PaginatedData<UserItem>;
    filters: {
        search?: string;
        department_id?: string;
        status?: string;
    };
    departments: Department[];
    roles: RoleItem[];
}

export default function UsersIndex({ users, filters, departments, roles }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

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
        email: '',
        password: '',
        department_id: '',
        role_id: roles[0]?.id ? String(roles[0].id) : '',
        status: 'active',
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
        email: '',
        password: '',
        department_id: '',
        role_id: '',
        status: 'active',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/users', {
            search: search.trim() || undefined,
            department_id: departmentId || undefined,
            status: statusFilter || undefined,
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setDepartmentId('');
        setStatusFilter('');
        router.get('/users');
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/users', {
            onSuccess: () => {
                setCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    const openEditModal = (user: UserItem) => {
        setSelectedUser(user);
        const userRoleId = user.roles?.[0]?.id ? String(user.roles[0].id) : (roles[0]?.id ? String(roles[0].id) : '');
        setEditData({
            name: user.name,
            email: user.email,
            password: '',
            department_id: user.department_id ? String(user.department_id) : '',
            role_id: userRoleId,
            status: user.status || 'active',
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        putEdit(`/users/${selectedUser.id}`, {
            onSuccess: () => {
                setEditModalOpen(false);
                setSelectedUser(null);
                resetEdit();
            },
        });
    };

    const handleDeleteUser = (user: UserItem) => {
        if (confirm(`هل أنت متأكد من رغبتك في حذف حساب المستخدم "${user.name}"؟`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    return (
        <AppLayout title="إدارة المستخدمين">
            <Head title="إدارة المستخدمين والموظفين - سيستم الأرشيف" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" />
                        <span>إدارة المستخدمين والموظفين</span>
                    </h2>

                </div>

                <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة مستخدم جديد</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="sm:col-span-3">
                        <select
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">كافة الأقسام</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">كافة الحالات</option>
                            <option value="active">نشط</option>
                            <option value="inactive">معطل</option>
                        </select>
                    </div>

                    <div className="sm:col-span-1 flex gap-1">
                        <button
                            type="submit"
                            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                            title="بحث"
                        >
                            بحث
                        </button>
                    </div>
                </form>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/80">
                            <th className="py-3.5 px-4">المستخدم</th>
                            <th className="py-3.5 px-3">القسم التابع له</th>
                            <th className="py-3.5 px-3">الدور والصلاحية</th>
                            <th className="py-3.5 px-3">الحالة</th>
                            <th className="py-3.5 px-3">تاريخ الانضمام</th>
                            <th className="py-3.5 px-3 text-left">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {users.data.map((u) => {
                            const roleName = u.roles?.[0]?.display_name || u.roles?.[0]?.name || 'مشاهد';
                            const isSuper = u.roles?.[0]?.name === 'admin';

                            return (
                                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                                    <span>{u.name}</span>
                                                    {isSuper && (
                                                        <span title="مدير عام">
                                                            <Shield className="w-3 h-3 text-amber-400 inline" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-3.5 px-3">
                                        <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 inline-flex items-center gap-1">
                                            <Building2 className="w-3 h-3 text-indigo-400" />
                                            <span>{(u.department as any)?.name ?? 'الإدارة '}</span>
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                                            isSuper
                                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                                                : roleName.includes('مؤرشف')
                                                ? 'bg-purple-950/60 text-purple-400 border-purple-800/50'
                                                : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}>
                                            {roleName}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-3">
                                        {u.status === 'active' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                                <CheckCircle2 className="w-3 h-3" />
                                                نشط
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                                معطل
                                            </span>
                                        )}
                                    </td>

                                    <td className="py-3.5 px-3 text-slate-400 text-[11px] font-mono">
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '-'}
                                    </td>

                                    <td className="py-3.5 px-3 text-left">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(u)}
                                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                title="تعديل المستخدم"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(u)}
                                                className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                                title="حذف المستخدم"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {users.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                                    لا يوجد مستخدمون مطابقون لمعايير البحث
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination links={users.links} />

            {/* Create User Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">إضافة مستخدم جديد للنظام</h3>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الاسم الكامل <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createData.name}
                                        onChange={(e) => setCreateData('name', e.target.value)}
                                        placeholder="مثال: يوسف الدوسري"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                    {createErrors.name && (
                                        <p className="text-[11px] text-rose-400">{createErrors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        البريد الإلكتروني <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={createData.email}
                                        onChange={(e) => setCreateData('email', e.target.value)}
                                        placeholder="user@archive.local"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                    {createErrors.email && (
                                        <p className="text-[11px] text-rose-400">{createErrors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    كلمة المرور <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={createData.password}
                                    onChange={(e) => setCreateData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                                {createErrors.password && (
                                    <p className="text-[11px] text-rose-400">{createErrors.password}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        القسم التابع له
                                    </label>
                                    <select
                                        value={createData.department_id}
                                        onChange={(e) => setCreateData('department_id', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">بدون قسم (الإدارة )</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الدور والصلاحيات <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={createData.role_id}
                                        onChange={(e) => setCreateData('role_id', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>{r.display_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">حالة الحساب</label>
                                <select
                                    value={createData.status}
                                    onChange={(e) => setCreateData('status', e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="active">نشط (يمكنه تسجيل الدخول)</option>
                                    <option value="inactive">معطل</option>
                                </select>
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
                                    disabled={createProcessing}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-50"
                                >
                                    {createProcessing ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">تعديل بيانات المستخدم</h3>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الاسم الكامل <span className="text-rose-400">*</span>
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
                                        البريد الإلكتروني <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData('email', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                    {editErrors.email && (
                                        <p className="text-[11px] text-rose-400">{editErrors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                                    <span>كلمة المرور الجديدة</span>
                                    <span className="text-[10px] text-slate-500">اتركها فارغة إذا لم ترغب في التغيير</span>
                                </label>
                                <input
                                    type="password"
                                    value={editData.password}
                                    onChange={(e) => setEditData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                {editErrors.password && (
                                    <p className="text-[11px] text-rose-400">{editErrors.password}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        القسم التابع له
                                    </label>
                                    <select
                                        value={editData.department_id}
                                        onChange={(e) => setEditData('department_id', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">بدون قسم (الإدارة )</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الدور والصلاحيات <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={editData.role_id}
                                        onChange={(e) => setEditData('role_id', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>{r.display_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">حالة الحساب</label>
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData('status', e.target.value as any)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="active">نشط</option>
                                    <option value="inactive">معطل</option>
                                </select>
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
                                    disabled={editProcessing}
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
