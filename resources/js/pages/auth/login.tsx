import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    CheckCircle2,
    Lock,
    LogIn,
    Mail,
    Shield,
    Sparkles,
    UserCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import type { DemoUser } from '../../types';

interface Props {
    demoUsers: DemoUser[];
}

export default function Login({ demoUsers }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: 'admin@archive.local',
        password: 'password',
        remember: true,
    });

    const [isSwitching, setIsSwitching] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    const handleQuickLogin = (userId: number) => {
        setIsSwitching(true);
        router.post('/demo-login', { user_id: userId }, {
            onFinish: () => setIsSwitching(false),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 antialiased selection:bg-indigo-500 selection:text-white" dir="rtl">
            <Head title="تسجيل الدخول - سيستم الأرشيف" />

            <div className="w-full max-w-md space-y-6">
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/20 mb-2">
                        <Archive className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        سيستم الأرشيف 
                    </h1>
                </div>
                {/* Standard Login Form */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                            {errors.email && (
                                <p className="text-[11px] text-rose-400 mt-1">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-300">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {errors.password && (
                                <p className="text-[11px] text-rose-400 mt-1">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                                />
                                <span className="text-slate-400">تذكرني على هذا الجهاز</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={processing || isSwitching}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                        >
                            <LogIn className="w-4 h-4" />
                            <span>{processing ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}</span>
                        </button>
                    </form>
                </div>

                {/* Footer security note */}
                <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>نظام آمن ومحمي وفق معايير الحوكمة والتحقق المزدوج</span>
                </div>
            </div>
        </div>
    );
}
