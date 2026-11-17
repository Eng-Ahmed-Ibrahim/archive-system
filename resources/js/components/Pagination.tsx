import { Link } from '@inertiajs/react';
import React from 'react';

interface Props {
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function Pagination({ links }: Props) {
    if (links.length <= 3) return null;

    return (
        <nav className="flex items-center justify-center gap-1 mt-6" aria-label="Pagination">
            {links.map((link, index) => {
                const isPrevious = link.label.includes('Previous') || link.label.includes('&laquo;');
                const isNext = link.label.includes('Next') || link.label.includes('&raquo;');
                const label = isPrevious ? 'السابق' : isNext ? 'التالي' : link.label;

                if (!link.url) {
                    return (
                        <span
                            key={index}
                            className="px-3 py-1.5 text-xs text-slate-500 rounded-lg cursor-not-allowed border border-slate-200 bg-white/50"
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            link.active
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                : 'bg-slate-100/80 border-slate-300/60 text-slate-700 hover:bg-slate-200 hover:text-indigo-900'
                        }`}
                        dangerouslySetInnerHTML={{ __html: label }}
                    />
                );
            })}
        </nav>
    );
}
