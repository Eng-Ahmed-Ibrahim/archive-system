import { Download, ExternalLink, Maximize2, X } from 'lucide-react';
import React from 'react';
import type { DocumentItem, DocumentVersion } from '../types';

interface Props {
    document: DocumentItem | null;
    version?: DocumentVersion | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FilePreviewModal({ document, version, isOpen, onClose }: Props) {
    if (!isOpen || !document) return null;

    const targetVersion = version || document.latest_version;
    const previewUrl = targetVersion
        ? `/documents/${document.id}/preview/${targetVersion.id}`
        : `/documents/${document.id}/preview`;

    const isImage = targetVersion?.mime_type?.includes('image') || targetVersion?.mime_type?.includes('svg');
    const isPdf = targetVersion?.mime_type?.includes('pdf');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                                {document.title}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-mono">
                                v{targetVersion?.version_no || 1}
                            </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                            {targetVersion?.original_name} • {document.reference_no}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            title="فتح في علامة تبويب جديدة"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>

                        <a
                            href={`/documents/${document.id}/download`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                            download
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">تحميل الملف</span>
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
                    {isPdf ? (
                        <iframe
                            src={previewUrl}
                            className="w-full h-full rounded-xl border border-slate-800 bg-white"
                            title={document.title}
                        />
                    ) : isImage ? (
                        <div className="max-w-full max-h-full flex items-center justify-center p-4">
                            <img
                                src={previewUrl}
                                alt={document.title}
                                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-xl border border-slate-800"
                            />
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                <Maximize2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-200">
                                المعاينة المباشرة غير مدعومة لهذا النوع من الملفات
                            </h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                ({targetVersion?.mime_type || 'ملف غير معروف'}) يمكنك تحميل الملف لفتحه عبر التطبيق المخصص على جهازك.
                            </p>
                            <a
                                href={`/documents/${document.id}/download`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors mt-2"
                                download
                            >
                                <Download className="w-4 h-4" />
                                تحميل الملف الآن
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
