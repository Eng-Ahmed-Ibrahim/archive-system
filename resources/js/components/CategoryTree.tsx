import { Link } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronLeft,
    Folder,
    FolderOpen,
    FolderPlus,
} from 'lucide-react';
import React, { useState } from 'react';
import type { Category } from '../types';

interface Props {
    categories: Category[];
    selectedCategoryId?: number | null;
    onSelectCategory?: (category: Category) => void;
    onNewFolderClick?: (parentId?: number) => void;
    canManageFolders?: boolean;
}

export default function CategoryTree({
    categories,
    selectedCategoryId,
    onSelectCategory,
    onNewFolderClick,
    canManageFolders = true,
}: Props) {
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

    const toggleExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // Group categories by parent_id
    const rootCategories = categories.filter((c) => !c.parent_id);
    const getChildren = (parentId: number) => categories.filter((c) => c.parent_id === parentId);

    const renderNode = (category: Category, depth = 0) => {
        const children = getChildren(category.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds[category.id] ?? depth === 0;
        const isSelected = selectedCategoryId === category.id;

        return (
            <div key={category.id} className="select-none">
                <div
                    onClick={() => onSelectCategory && onSelectCategory(category)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isSelected
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    style={{ paddingRight: `${depth * 14 + 10}px` }}
                >
                    <div className="flex items-center gap-2 truncate">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(e) => toggleExpand(category.id, e)}
                                className="p-0.5 text-slate-400 hover:text-white"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                )}
                            </button>
                        ) : (
                            <span className="w-3.5" />
                        )}

                        {isExpanded ? (
                            <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-amber-400'}`} />
                        ) : (
                            <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-amber-400/80'}`} />
                        )}

                        <span className="truncate">{category.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {typeof category.documents_count !== 'undefined' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                                {category.documents_count}
                            </span>
                        )}

                        {canManageFolders && onNewFolderClick && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNewFolderClick(category.id);
                                }}
                                title="إضافة مجلد فرعي هنا"
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-300 transition-opacity"
                            >
                                <FolderPlus className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="mt-0.5 space-y-0.5 border-r border-slate-800/60 mr-3">
                        {children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-1">
            {rootCategories.map((cat) => renderNode(cat))}
            {rootCategories.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                    لا توجد مجلدات مسجلة
                </div>
            )}
        </div>
    );
}
