import { Link, router, usePage } from '@inertiajs/react';
import {
    Archive,
    Building2,
    CheckCircle2,
    ChevronDown,
    FilePlus,
    FileText,
    FolderTree,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Shield,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import type { SharedProps } from '../types';

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
    const { auth, flash, appName } = usePage<SharedProps>().props;
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [demoMenuOpen, setDemoMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.get('/documents', { search: searchQuery.trim() });
        }
    };

    const handleDemoSwitch = (userId: number) => {
        setDemoMenuOpen(false);
        router.post('/demo-login', { user_id: userId });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const currentPath = window.location.pathname;

    const navItems = [
        { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
        { name: ' المجلدات', href: '/categories', icon: FolderTree },
        { name: 'الأرشيف والمستندات', href: '/documents', icon: FileText },
        { name: 'رفع ملف جديد', href: '/documents/create', icon: FilePlus },
    ];

    if (auth.user?.is_admin  || auth.user?.permissions?.includes('*')) {
        navItems.push({ name: 'الاقسام', href: 'departments', icon: Building2 });
    }
    if (auth.user?.is_admin || auth.user?.permissions?.includes('users.manage') || auth.user?.permissions?.includes('*')) {
        navItems.push({ name: 'إدارة المستخدمين', href: '/users', icon: Users });
    }

    if (auth.user?.is_admin || auth.user?.permissions?.includes('audit.view') || auth.user?.permissions?.includes('*')) {
        navItems.push({ name: 'التدقيق', href: '/audit-logs', icon: History });
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
                <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    {/* Left: Hamburger & Brand */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            aria-label="القائمة"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <Link href="/dashboard" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                <Archive className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="font-bold text-base tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                                    {appName || 'سيستم الأرشيف'}
                                </h1>
                                <p className="text-[10px] text-slate-400 -mt-1 font-medium">إدارة الملفات </p>
                            </div>
                        </Link>
                    </div>

                    {/* Center: Global Search Bar */}
                    <div className="flex-1 max-w-lg hidden md:block">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ابحث بالرقم المرجعي أو العنوان أو الوسم... (اضغط Enter)"
                                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                            />
                        </form>
                    </div>

                    {/* Right: Quick Demo Switcher & User Profile */}
                    <div className="flex items-center gap-2.5">
  
                        {/* Current User Badge */}
                        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow">
                                {auth.user?.name ? auth.user.name.charAt(0) : 'U'}
                            </div>
                            <div className="hidden lg:block text-right">
                                <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                                    {auth.user?.name}
                              
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    {typeof auth.user?.department === 'string'
                                        ? auth.user?.department
                                        : (auth.user?.department as any)?.name ?? 'الإدارة '}
                                </div>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors"
                            title="تسجيل الخروج"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Flash Messages */}
            {flash?.success && (
                <div className="bg-emerald-950/80 border-b border-emerald-700/60 px-4 py-2.5 text-xs sm:text-sm text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                </div>
            )}
            {flash?.error && (
                <div className="bg-rose-950/80 border-b border-rose-700/60 px-4 py-2.5 text-xs sm:text-sm text-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                </div>
            )}

            {/* Main Layout Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop & Mobile Sidebar */}
                <aside
                    className={`fixed inset-y-0 right-0 z-30 w-64 bg-slate-900 border-l border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
                        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="p-4 border-b border-slate-800/80 flex items-center justify-between lg:hidden">
                        <span className="font-bold text-sm text-slate-200">القائمة الرئيسية</span>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Mobile Backdrop */}
                {sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-xs"
                    />
                )}

                {/* Content Container */}
                <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
