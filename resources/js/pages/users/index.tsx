import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Edit2,
    Eraser,
    Search,
    Shield,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
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
    order_num?: number;
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
    orderStats: Record<string, number>;
}

const inputCls =
    'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500';

export default function UsersIndex({ users, filters, departments, roles, orderStats }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const signatureRef = useRef<SignatureCanvas>(null);

    // آخر رقم ترتيب مسجل في القسم (d0 = بدون قسم)
    const getLastOrder = (deptId: string) => orderStats?.[`d${deptId || 0}`] ?? 0;

    const defaultRoleId = roles[0]?.id ? String(roles[0].id) : '';

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

    // Signature
    const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);

    // Create Form
    const {
        data: createData,
        setData: setCreateData,
        post: postCreate,
        processing: createProcessing,
        clearErrors: clearCreateErrors,
        errors: createErrors,
        transform: transformCreate,
    } = useForm({
        name: '',
        email: '',
        password: '',
        department_id: '',
        role_id: defaultRoleId,
        status: 'active',
        signature: null as File | null,
        order_num: getLastOrder('') + 1,
    });

    // Edit Form
    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        reset: resetEdit,
        clearErrors: clearEditErrors,
        errors: editErrors,
    } = useForm({
        name: '',
        email: '',
        password: '',
        department_id: '',
        role_id: '',
        status: 'active',
        order_num: 1,
    });

    // ضبط حجم الـ canvas ليطابق حجمه الظاهر (عشان القلم يرسم في مكانه الصحيح)
    useEffect(() => {
        if (!createModalOpen || signatureMode !== 'draw') return;

        const timer = setTimeout(() => {
            const canvas = signatureRef.current?.getCanvas();
            if (!canvas) return;

            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            signatureRef.current?.clear();
        }, 50);

        return () => clearTimeout(timer);
    }, [createModalOpen, signatureMode]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/users',
            {
                search: search.trim() || undefined,
                department_id: departmentId || undefined,
                status: statusFilter || undefined,
            },
            { preserveState: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setDepartmentId('');
        setStatusFilter('');
        router.get('/users');
    };

    const hasFilters = !!(filters.search || filters.department_id || filters.status);

    // ---------- Signature helpers ----------
    const canvasToFile = (): Promise<File | null> => {
        return new Promise((resolve) => {
            const canvas = signatureRef.current?.getCanvas();

            if (!canvas || signatureRef.current?.isEmpty()) {
                resolve(null);
                return;
            }

            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                resolve(new File([blob], 'signature.png', { type: 'image/png' }));
            }, 'image/png');
        });
    };

    const clearDrawnSignature = () => {
        signatureRef.current?.clear();
    };

    const removeUploadedSignature = () => {
        if (signatureImage) URL.revokeObjectURL(signatureImage);
        setSignatureFile(null);
        setSignatureImage(null);
    };

    const resetSignatureState = () => {
        signatureRef.current?.clear();
        removeUploadedSignature();
        setSignatureMode('draw');
    };

    // ---------- Create ----------
    const openCreateModal = () => {
        clearCreateErrors();
        resetSignatureState();
        // الرقم المقترح = آخر رقم + 1 (بيتحسب وقت الفتح عشان orderStats يكون محدّث)
        setCreateData({
            name: '',
            email: '',
            password: '',
            department_id: '',
            role_id: defaultRoleId,
            status: 'active',
            signature: null,
            order_num: getLastOrder('') + 1,
        });
        setCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setCreateModalOpen(false);
        clearCreateErrors();
        resetSignatureState();
    };

    const handleCreateDepartmentChange = (value: string) => {
        // دالة بتدمج مع القيم الحالية (ماتمسحش باقي الحقول)
        setCreateData((prev) => ({
            ...prev,
            department_id: value,
            order_num: getLastOrder(value) + 1,
        }));
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const signature = signatureMode === 'draw' ? await canvasToFile() : signatureFile;

        transformCreate((data) => ({ ...data, signature }));

        postCreate('/users', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => closeCreateModal(),
        });
    };

    // ---------- Edit ----------
    const openEditModal = (user: UserItem) => {
        setSelectedUser(user);
        clearEditErrors();

        const userRoleId = user.roles?.[0]?.id ? String(user.roles[0].id) : defaultRoleId;

        setEditData({
            name: user.name,
            email: user.email,
            password: '',
            department_id: user.department_id ? String(user.department_id) : '',
            role_id: userRoleId,
            status: user.status || 'active',
            order_num: user.order_num ?? 1,
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setSelectedUser(null);
        clearEditErrors();
        resetEdit();
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        putEdit(`/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditModal(),
        });
    };

    const handleEditDepartmentChange = (value: string) => {
        const originalDept = selectedUser?.department_id ? String(selectedUser.department_id) : '';

        // لو رجع لقسمه الأصلي نرجّع ترتيبه الأصلي، غير كده نقترح آخر رقم + 1
        const order =
            value === originalDept ? (selectedUser?.order_num ?? 1) : getLastOrder(value) + 1;

        // دالة بتدمج مع القيم الحالية (ماتمسحش باقي الحقول)
        setEditData((prev) => ({
            ...prev,
            department_id: value,
            order_num: order,
        }));
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
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة مستخدم جديد</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 relative">
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
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
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
                                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700"
                                title="مسح الفلاتر"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
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
                            <th className="py-3.5 px-3">الترتيب</th>
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
                                                <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
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
                                        <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                                            #{u.order_num ?? '-'}
                                        </span>
                                    </td>

                                    <td className="py-3.5 px-3">
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                                                isSuper
                                                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                                                    : roleName.includes('مؤرشف')
                                                      ? 'bg-purple-950/60 text-purple-400 border-purple-800/50'
                                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                            }`}
                                        >
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
                    <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">إضافة مستخدم</h3>
                            </div>
                            <button type="button" onClick={closeCreateModal} className="text-slate-400 hover:text-white">
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
                                        className={inputCls}
                                        required
                                    />
                                    {createErrors.name && <p className="text-[11px] text-rose-400">{createErrors.name}</p>}
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
                                        className={inputCls}
                                        required
                                    />
                                    {createErrors.email && <p className="text-[11px] text-rose-400">{createErrors.email}</p>}
                                </div>
                            </div>

                            {/* Signature */}
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-slate-300">التوقيع الإلكتروني</label>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSignatureMode('draw')}
                                        className={`flex-1 rounded-lg px-4 py-2 text-xs ${
                                            signatureMode === 'draw'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-300'
                                        }`}
                                    >
                                        رسم التوقيع
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSignatureMode('upload')}
                                        className={`flex-1 rounded-lg px-4 py-2 text-xs ${
                                            signatureMode === 'upload'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-300'
                                        }`}
                                    >
                                        رفع صورة
                                    </button>
                                </div>

                                {signatureMode === 'draw' ? (
                                    <div className="space-y-2">
                                        <div className="rounded-xl border border-slate-700 bg-white overflow-hidden">
                                            <SignatureCanvas
                                                ref={signatureRef}
                                                penColor="black"
                                                canvasProps={{
                                                    className: 'w-full h-36 cursor-crosshair touch-none',
                                                    style: { width: '100%', height: '144px', display: 'block' },
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={clearDrawnSignature}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
                                        >
                                            <Eraser className="w-3.5 h-3.5" />
                                            <span>مسح وإعادة الكتابة</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                if (signatureImage) URL.revokeObjectURL(signatureImage);
                                                setSignatureFile(file);
                                                setSignatureImage(URL.createObjectURL(file));
                                            }}
                                            className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white"
                                        />

                                        {signatureImage && (
                                            <div className="relative rounded-xl border border-slate-700 bg-white p-4">
                                                <img
                                                    src={signatureImage}
                                                    alt="Signature preview"
                                                    className="mx-auto h-32 max-w-full object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeUploadedSignature}
                                                    className="mt-2 text-xs text-red-500"
                                                >
                                                    حذف الصورة
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {createErrors.signature && (
                                    <p className="text-[11px] text-rose-400">{createErrors.signature}</p>
                                )}
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
                                    className={inputCls}
                                    required
                                />
                                {createErrors.password && (
                                    <p className="text-[11px] text-rose-400">{createErrors.password}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">القسم التابع له</label>
                                    <select
                                        value={createData.department_id}
                                        onChange={(e) => handleCreateDepartmentChange(e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">بدون قسم (الإدارة )</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    {createErrors.department_id && (
                                        <p className="text-[11px] text-rose-400">{createErrors.department_id}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الدور والصلاحيات <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={createData.role_id}
                                        onChange={(e) => setCreateData('role_id', e.target.value)}
                                        className={inputCls}
                                        required
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.display_name}
                                            </option>
                                        ))}
                                    </select>
                                    {createErrors.role_id && (
                                        <p className="text-[11px] text-rose-400">{createErrors.role_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    ترتيب الأولوية في القسم <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={createData.order_num}
                                    onChange={(e) => setCreateData('order_num', Number(e.target.value))}
                                    className={inputCls}
                                    required
                                />
                                <p className="text-[10px] text-slate-500">
                                    آخر رقم مسجل في هذا القسم: {getLastOrder(createData.department_id) || 'لا يوجد'} (1 =
                                    الأعلى أولوية)
                                </p>
                                {createErrors.order_num && (
                                    <p className="text-[11px] text-rose-400">{createErrors.order_num}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">حالة الحساب</label>
                                <select
                                    value={createData.status}
                                    onChange={(e) => setCreateData('status', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="active">نشط (يمكنه تسجيل الدخول)</option>
                                    <option value="inactive">معطل</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
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
                    <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">تعديل بيانات المستخدم</h3>
                            </div>
                            <button type="button" onClick={closeEditModal} className="text-slate-400 hover:text-white">
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
                                        className={inputCls}
                                        required
                                    />
                                    {editErrors.name && <p className="text-[11px] text-rose-400">{editErrors.name}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        البريد الإلكتروني <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData('email', e.target.value)}
                                        className={inputCls}
                                        required
                                    />
                                    {editErrors.email && <p className="text-[11px] text-rose-400">{editErrors.email}</p>}
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
                                    className={inputCls}
                                />
                                {editErrors.password && <p className="text-[11px] text-rose-400">{editErrors.password}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">القسم التابع له</label>
                                    <select
                                        value={editData.department_id}
                                        onChange={(e) => handleEditDepartmentChange(e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">بدون قسم (الإدارة )</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    {editErrors.department_id && (
                                        <p className="text-[11px] text-rose-400">{editErrors.department_id}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        الدور والصلاحيات <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={editData.role_id}
                                        onChange={(e) => setEditData('role_id', e.target.value)}
                                        className={inputCls}
                                        required
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.display_name}
                                            </option>
                                        ))}
                                    </select>
                                    {editErrors.role_id && <p className="text-[11px] text-rose-400">{editErrors.role_id}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">
                                    ترتيب الأولوية في القسم <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={editData.order_num}
                                    onChange={(e) => setEditData('order_num', Number(e.target.value))}
                                    className={inputCls}
                                    required
                                />
                                <p className="text-[10px] text-slate-500">
                                    آخر رقم مسجل في هذا القسم: {getLastOrder(editData.department_id) || 'لا يوجد'} (1 =
                                    الأعلى أولوية)
                                </p>
                                {editErrors.order_num && (
                                    <p className="text-[11px] text-rose-400">{editErrors.order_num}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-300">حالة الحساب</label>
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData('status', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="active">نشط</option>
                                    <option value="inactive">معطل</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
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