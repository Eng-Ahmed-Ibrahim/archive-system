import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownToLine,
    ArrowRight,
    ArrowUpFromLine,
    Building2,
    Calendar,
    Check,
    CheckCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Eraser,
    ExternalLink,
    Eye,
    FileImage,
    FileText,
    Folder,
    Layers,
    Loader2,
    MessageSquare,
    Move,
    PenTool,
    RefreshCw,
    Send,
    Share2,
    Shield,
    Trash2,
    UploadCloud,
    User as UserIcon,
    X,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import React, { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import ShareModal from '../../components/ShareModal';
import AppLayout from '../../layouts/AppLayout';
import type { DocumentItem, DocumentVersion, SharedProps, User } from '../../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface RecipientItem {
    id: number;
    priority: number;
    status: 'pending' | 'read';
    read_at?: string | null;
    user?: { id: number; name: string };
    sender?: { id: number; name: string } | null;
    department?: { id: number; name: string };
}

interface CommentItem {
    id: number;
    body: string;
    created_at?: string;
    user?: { id: number; name: string };
}

type FullDocument = DocumentItem & {
    direction?: 'incoming' | 'outgoing';
    recipients?: RecipientItem[];
    comments?: CommentItem[];
};

interface ForwardableUser {
    id: number;
    name: string;
    order_num: number | null;
    department?: { id: number; name: string } | null;
}

interface RecipientUser {
    id: number;
    name: string;
    department_id: number;
    order_num: number | null;
}

interface RecipientDepartment {
    id: number;
    name: string;
    users: RecipientUser[];
}

interface Props {
    document: FullDocument;
    shareableUsers: User[];
    forwardableUsers: ForwardableUser[];
    recipientDepartments: RecipientDepartment[];
    userSignatureUrl?: string | null;
    hasSignature?: boolean;
    can: {
        update: boolean;
        delete: boolean;
        download: boolean;
        addVersion: boolean;
        share: boolean;
        forward: boolean;
        sign: boolean;
        updateStatus: boolean;
    };
}

type Tab = 'meta' | 'comments' | 'recipients' | 'versions' | 'audit';

type SigData = { bytes: ArrayBuffer; format: 'png' | 'jpg' };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

export default function DocumentShow({
    document,
    shareableUsers,
    forwardableUsers,
    recipientDepartments,
    userSignatureUrl,
    hasSignature,
    can,
}: Props) {
    const { auth } = usePage<SharedProps>().props;
    const roles: string[] = (auth.user as any)?.roles ?? [];
    const isAdmin = roles.includes('admin') || auth.user?.is_admin;

    const [activeTab, setActiveTab] = useState<Tab>('meta');
    const [selectedPreviewVersion, setSelectedPreviewVersion] = useState<DocumentVersion | null>(null);
    const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [forwardModalOpen, setForwardModalOpen] = useState(false);
    const [signModalOpen, setSignModalOpen] = useState(false);

    // Multi-department forward state
    const [selectedForwardDeptId, setSelectedForwardDeptId] = useState<string>(
        recipientDepartments[0]?.id ? String(recipientDepartments[0].id) : '',
    );
    const [selectedForwardUserIds, setSelectedForwardUserIds] = useState<number[]>([]);
    const [forwardNote, setForwardNote] = useState('');
    const [forwardSubmitting, setForwardSubmitting] = useState(false);

    // Document Signing state
    const [signStep, setSignStep] = useState<'source' | 'place'>('source');
    const [signSource, setSignSource] = useState<'profile' | 'draw' | 'upload'>(
        hasSignature ? 'profile' : 'draw',
    );
    const [signMarkFinish, setSignMarkFinish] = useState(true);
    const [signNote, setSignNote] = useState('');
    const [uploadedSignFile, setUploadedSignFile] = useState<File | null>(null);
    const [signProcessing, setSignProcessing] = useState(false);
    const [signProcessingMsg, setSignProcessingMsg] = useState('');
    const signCanvasRef = useRef<SignatureCanvas>(null);

    // Free placement state (all values are fractions 0..1 of the page/image size)
    const [sigPreviewUrl, setSigPreviewUrl] = useState<string | null>(null);
    const [sigRatio, setSigRatio] = useState(0.4); // height / width of the signature image
    const [sigFx, setSigFx] = useState(0.55);
    const [sigFy, setSigFy] = useState(0.8);
    const [sigW, setSigW] = useState(0.28);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(1);
    const [pageLoading, setPageLoading] = useState(false);
    const [pdfReady, setPdfReady] = useState(false);

    const sigDataRef = useRef<SigData | null>(null);
    const pdfBytesRef = useRef<ArrayBuffer | null>(null);
    const pdfJsDocRef = useRef<any>(null);
    const pageCanvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; fx: number; fy: number } | null>(null);

    const latestVersion = document.latest_version;
    const currentVersion = selectedPreviewVersion || latestVersion;
    const previewUrl = selectedPreviewVersion
        ? `/documents/${document.id}/preview/${selectedPreviewVersion.id}`
        : `/documents/${document.id}/preview`;

    const isPdf = !!currentVersion?.mime_type?.includes('pdf');
    const isImage = !!(currentVersion?.mime_type?.includes('image') || currentVersion?.mime_type?.includes('svg'));

    const recipients = document.recipients ?? [];
    const comments = document.comments ?? [];

    // Reset forward selections when forward dept changes
    const currentForwardDept = recipientDepartments.find((d) => String(d.id) === selectedForwardDeptId);

    // Reset signing state whenever the sign modal opens
    useEffect(() => {
        if (!signModalOpen) return;
        setSignStep('source');
        setSignSource(hasSignature ? 'profile' : 'draw');
        setSigPreviewUrl(null);
        setSigFx(0.55);
        setSigFy(0.8);
        setSigW(0.28);
        setPageNum(1);
        setNumPages(1);
        setPdfReady(false);
        sigDataRef.current = null;
        pdfBytesRef.current = null;
        pdfJsDocRef.current = null;
        setUploadedSignFile(null);
    }, [signModalOpen]);

    // Reset canvas when sign modal opens or mode changes
    useEffect(() => {
        if (!signModalOpen || signStep !== 'source' || signSource !== 'draw') return;
        const timer = setTimeout(() => {
            const canvas = signCanvasRef.current?.getCanvas();
            if (!canvas) return;
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            signCanvasRef.current?.clear();
        }, 80);
        return () => clearTimeout(timer);
    }, [signModalOpen, signSource, signStep]);

    // Render the selected PDF page onto the canvas (placement step)
    useEffect(() => {
        if (signStep !== 'place' || !isPdf || !pdfReady || !pdfJsDocRef.current) return;
        let cancelled = false;
        let task: any = null;

        (async () => {
            setPageLoading(true);
            try {
                const page = await pdfJsDocRef.current.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = pageCanvasRef.current;
                if (!canvas || cancelled) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
                await task.promise;
            } catch {
                // render cancelled or failed
            } finally {
                if (!cancelled) setPageLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            task?.cancel?.();
        };
    }, [signStep, pageNum, isPdf, pdfReady]);

    // Forms
    const {
        data: versionData,
        setData: setVersionData,
        post: postVersion,
        processing: versionProcessing,
        reset: resetVersion,
        errors: versionErrors,
    } = useForm({ file: null as File | null, change_notes: '' });

    const {
        data: commentData,
        setData: setCommentData,
        post: postComment,
        processing: commentProcessing,
        reset: resetComment,
        errors: commentErrors,
    } = useForm({ body: '' });

    const handleVersionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postVersion(`/documents/${document.id}/versions`, {
            forceFormData: true,
            onSuccess: () => {
                setNewVersionModalOpen(false);
                resetVersion();
            },
        });
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postComment(`/documents/${document.id}/comments`, {
            preserveScroll: true,
            onSuccess: () => resetComment(),
        });
    };

    // Forwarding to another department
    const handleToggleForwardUser = (userId: number) => {
        setSelectedForwardUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
        );
    };

    const handleSelectAllDeptUsers = () => {
        if (!currentForwardDept) return;
        const allIds = currentForwardDept.users.map((u) => u.id);
        if (selectedForwardUserIds.length === allIds.length) {
            setSelectedForwardUserIds([]);
        } else {
            setSelectedForwardUserIds(allIds);
        }
    };

    const handleForwardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedForwardDeptId) {
            alert('يرجى اختيار القسم المحول إليه.');
            return;
        }

        setForwardSubmitting(true);
        router.post(
            `/documents/${document.id}/forward`,
            {
                department_id: Number(selectedForwardDeptId),
                user_ids: selectedForwardUserIds,
                note: forwardNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setForwardModalOpen(false);
                    setSelectedForwardUserIds([]);
                    setForwardNote('');
                    setForwardSubmitting(false);
                },
                onError: () => {
                    setForwardSubmitting(false);
                },
            },
        );
    };

    // Status Toggle
    const handleToggleStatus = (newStatus: 'pending' | 'finish') => {
        const confirmMsg =
            newStatus === 'finish'
                ? 'هل تريد إنهاء المعاملة وتحديد المستند كمكتمل؟'
                : 'هل تريد إعادة فتح المعاملة وجعلها قيد الإجراء؟';

        if (confirm(confirmMsg)) {
            router.post(
                `/documents/${document.id}/status`,
                { status: newStatus },
                { preserveScroll: true },
            );
        }
    };

    // ---------- Document Signing Logic ----------

    const getSignatureImageBytes = async (): Promise<SigData | null> => {
        if (signSource === 'profile') {
            if (!userSignatureUrl) return null;
            const res = await fetch(userSignatureUrl);
            const blob = await res.blob();
            const format = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
            const bytes = await blob.arrayBuffer();
            return { bytes, format };
        } else if (signSource === 'draw') {
            if (!signCanvasRef.current || signCanvasRef.current.isEmpty()) {
                alert('يرجى رسم التوقيع أولاً في منطقة الرسم.');
                return null;
            }
            const dataUrl = signCanvasRef.current.toDataURL('image/png');
            const res = await fetch(dataUrl);
            const bytes = await res.arrayBuffer();
            return { bytes, format: 'png' };
        } else if (signSource === 'upload') {
            if (!uploadedSignFile) {
                alert('يرجى اختيار صورة التوقيع أولاً.');
                return null;
            }
            const format = uploadedSignFile.type.includes('jpeg') ? 'jpg' : 'png';
            const bytes = await uploadedSignFile.arrayBuffer();
            return { bytes, format };
        }
        return null;
    };

    // Step 1 -> Step 2: prepare the signature + load the document for placement
    const handleGoToPlacement = async () => {
        if (!isPdf && !isImage) {
            alert('تعذر تطبيق التوقيع على هذا النوع من الملفات.');
            return;
        }

        setSignProcessing(true);
        setSignProcessingMsg('جارٍ تجهيز التوقيع والمستند...');

        try {
            const sigData = await getSignatureImageBytes();
            if (!sigData) {
                setSignProcessing(false);
                return;
            }
            sigDataRef.current = sigData;

            if (sigPreviewUrl && sigPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(sigPreviewUrl);
            const blob = new Blob([sigData.bytes], {
                type: sigData.format === 'jpg' ? 'image/jpeg' : 'image/png',
            });
            setSigPreviewUrl(URL.createObjectURL(blob));

            if (isPdf) {
                const pdfRes = await fetch(previewUrl);
                const bytes = await pdfRes.arrayBuffer();
                pdfBytesRef.current = bytes;
                // pdf.js detaches the buffer it receives, so give it a copy
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) });
                const pdf = await loadingTask.promise;
                pdfJsDocRef.current = pdf;
                setNumPages(pdf.numPages);
                setPageNum(pdf.numPages); // start on the last page (usual signing page)
                setPdfReady(true);
            }

            setSigFx(0.55);
            setSigFy(0.8);
            setSignStep('place');
        } catch (err) {
            console.error('Prepare signing error:', err);
            alert('تعذر تحميل المستند للتوقيع.');
        } finally {
            setSignProcessing(false);
        }
    };

    // Dragging the signature
    const onSigPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { startX: e.clientX, startY: e.clientY, fx: sigFx, fy: sigFy };
    };

    const onSigPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current;
        const wrapper = wrapperRef.current;
        const overlay = overlayRef.current;
        if (!d || !wrapper || !overlay) return;

        const rect = wrapper.getBoundingClientRect();
        const heightFrac = overlay.offsetHeight / rect.height;

        setSigFx(clamp(d.fx + (e.clientX - d.startX) / rect.width, 0, 1 - sigW));
        setSigFy(clamp(d.fy + (e.clientY - d.startY) / rect.height, 0, 1 - heightFrac));
    };

    const onSigPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        dragRef.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const handleSizeChange = (value: number) => {
        setSigW(value);
        setSigFx((prev) => clamp(prev, 0, 1 - value));
    };

    const handleApplySignature = async (e: React.FormEvent) => {
        e.preventDefault();
        const sigData = sigDataRef.current;
        if (!sigData) return;

        setSignProcessing(true);
        setSignProcessingMsg('جارٍ تجهيز ملف التوقيع الرقمي...');

        try {
            let signedFile: File | null = null;

            if (isPdf) {
                setSignProcessingMsg('جارٍ ختم التوقيع على ملف الـ PDF...');
                const existingPdfBytes = pdfBytesRef.current ?? (await (await fetch(previewUrl)).arrayBuffer());

                const pdfDoc = await PDFDocument.load(existingPdfBytes);
                const embeddedSig =
                    sigData.format === 'jpg'
                        ? await pdfDoc.embedJpg(sigData.bytes)
                        : await pdfDoc.embedPng(sigData.bytes);

                const pages = pdfDoc.getPages();
                const targetPage = pages[Math.min(pageNum, pages.length) - 1];
                const { width, height } = targetPage.getSize();

                const sigWidth = sigW * width;
                const sigHeight = sigWidth * sigRatio;
                const posX = sigFx * width;
                // PDF origin is bottom-left, screen origin is top-left
                const posY = height - sigFy * height - sigHeight;

                targetPage.drawImage(embeddedSig, {
                    x: posX,
                    y: posY,
                    width: sigWidth,
                    height: sigHeight,
                });

                const modifiedPdfBytes = await pdfDoc.save();
                signedFile = new File(
                    [modifiedPdfBytes as any],
                    `signed_${document.reference_no || 'doc'}.pdf`,
                    { type: 'application/pdf' },
                );
            } else if (isImage) {
                setSignProcessingMsg('جارٍ ختم التوقيع على ملف الصورة...');
                signedFile = await new Promise<File | null>((resolve) => {
                    const docImg = new Image();
                    docImg.crossOrigin = 'anonymous';
                    docImg.onerror = () => resolve(null);
                    docImg.onload = () => {
                        const canvas = window.document.createElement('canvas');
                        canvas.width = docImg.naturalWidth || docImg.width;
                        canvas.height = docImg.naturalHeight || docImg.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(null);
                            return;
                        }

                        // Draw base document
                        ctx.drawImage(docImg, 0, 0, canvas.width, canvas.height);

                        // Draw signature at the exact place the user chose
                        const sigImg = new Image();
                        const sigBlob = new Blob([sigData.bytes], {
                            type: sigData.format === 'jpg' ? 'image/jpeg' : 'image/png',
                        });
                        const sigUrl = URL.createObjectURL(sigBlob);
                        sigImg.onload = () => {
                            const w = sigW * canvas.width;
                            const h = w * sigRatio;
                            const x = sigFx * canvas.width;
                            const y = sigFy * canvas.height;

                            ctx.drawImage(sigImg, x, y, w, h);
                            URL.revokeObjectURL(sigUrl);

                            canvas.toBlob((blob) => {
                                if (blob) {
                                    resolve(
                                        new File([blob], `signed_${document.reference_no || 'doc'}.png`, {
                                            type: 'image/png',
                                        }),
                                    );
                                } else {
                                    resolve(null);
                                }
                            }, 'image/png');
                        };
                        sigImg.src = sigUrl;
                    };
                    docImg.src = previewUrl;
                });
            }

            if (!signedFile) {
                alert('تعذر تطبيق التوقيع على هذا النوع من الملفات.');
                setSignProcessing(false);
                return;
            }

            setSignProcessingMsg('جارٍ حفظ واعتماد الإصدار الموقع بالخادم...');

            // Submit to /documents/{document}/sign
            const formData = new FormData();
            formData.append('file', signedFile);
            formData.append('mark_as_finish', signMarkFinish ? '1' : '0');
            if (signNote) {
                formData.append('note', signNote);
            }

            router.post(`/documents/${document.id}/sign`, formData, {
                forceFormData: true,
                onSuccess: () => {
                    setSignModalOpen(false);
                    setSignProcessing(false);
                    setSignNote('');
                },
                onError: () => {
                    setSignProcessing(false);
                    alert('حدث خطأ أثناء حفظ التوقيع.');
                },
            });
        } catch (err) {
            console.error('Signing error:', err);
            alert('حدث خطأ أثناء معالجة ملف التوقيع.');
            setSignProcessing(false);
        }
    };

    const handleDelete = () => {
        if (confirm(`هل أنت متأكد من حذف المستند "${document.title}" ونقله لسلة المحذوفات؟`)) {
            router.delete(`/documents/${document.id}`);
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'meta', label: 'البيانات' },
        { key: 'comments', label: `التعليقات (${comments.length})` },
        { key: 'recipients', label: `تتبع (${recipients.length})` },
        // { key: 'versions', label: `الإصدارات (${document.versions?.length || 1})` },
        ...(isAdmin ? [{ key: 'audit' as Tab, label: 'السجل' }] : []),
    ];

    const isFinished = document.status === 'finish';

    // Draggable signature overlay (shared by PDF and image placement)
    const signatureOverlay = sigPreviewUrl && (
        <div
            ref={overlayRef}
            onPointerDown={onSigPointerDown}
            onPointerMove={onSigPointerMove}
            onPointerUp={onSigPointerUp}
            onPointerCancel={onSigPointerUp}
            className="absolute cursor-move touch-none select-none border-2 border-dashed border-purple-500 bg-purple-500/10 hover:bg-purple-500/20"
            style={{
                left: `${sigFx * 100}%`,
                top: `${sigFy * 100}%`,
                width: `${sigW * 100}%`,
            }}
        >
            <img
                src={sigPreviewUrl}
                alt="التوقيع"
                draggable={false}
                onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth) setSigRatio(img.naturalHeight / img.naturalWidth);
                }}
                className="block w-full pointer-events-none"
            />
        </div>
    );

    return (
        <AppLayout title={document.title}>
            <Head title={`${document.title} - سيستم الأرشيف`} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Link href="/documents" className="hover:text-indigo-600 transition-colors">
                            الأرشيف
                        </Link>
                        <span>/</span>
                        <span>{document.department?.name || 'عام'}</span>
                        <span>/</span>
                        <span className="text-slate-900 font-semibold">{document.category?.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">{document.title}</h2>

                        {/* Status Badge (pending vs finish) */}
                        {isFinished ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>مكتمل (Finish)</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>قيد الإجراء (Pending)</span>
                            </span>
                        )}

                        {document.direction && (
                            <span
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-semibold shadow-2xs ${document.direction === 'incoming'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                            >
                                {document.direction === 'incoming' ? (
                                    <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                                ) : (
                                    <ArrowUpFromLine className="w-3 h-3 text-amber-600" />
                                )}
                                {document.direction === 'incoming' ? 'وارد' : 'صادر'}
                            </span>
                        )}

                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
                            {document.reference_no}
                        </span>

                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            v{latestVersion?.version_no || 1}
                        </span>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Sign Button */}
                    {can.sign && (
                        <button
                            type="button"
                            onClick={() => setSignModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-colors"
                        >
                            <PenTool className="w-4 h-4 text-purple-200" />
                            <span>توقيع المستند</span>
                        </button>
                    )}

                    {/* Forward Button */}
                    {can.forward && (
                        <button
                            type="button"
                            onClick={() => setForwardModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            <span>تحويل لقسم</span>
                        </button>
                    )}

                    {/* Status Toggle Button */}
                    {can.updateStatus && (
                        <>
                            {!isFinished ? (
                                <button
                                    type="button"
                                    onClick={() => handleToggleStatus('finish')}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors shadow-2xs"
                                    title="تعليم المستند كمكتمل ومنتهي"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>إنهاء المعاملة</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleToggleStatus('pending')}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors shadow-2xs"
                                    title="إعادة فتح المعاملة"
                                >
                                    <RefreshCw className="w-4 h-4 text-amber-600" />
                                    <span>إعادة فتح</span>
                                </button>
                            )}
                        </>
                    )}

                    {can.download && (
                        <a
                            href={`/documents/${document.id}/download`}
                            download
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                        >
                            <Download className="w-4 h-4 text-indigo-600" />
                            <span>تحميل</span>
                        </a>
                    )}

                    {can.delete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 shadow-2xs transition-colors"
                            title="حذف المستند"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {/* Document Content & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Preview */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-800">
                                معاينة الملف (v{currentVersion?.version_no || 1})
                            </span>
                            {currentVersion?.change_notes && (
                                <span className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md truncate max-w-xs">
                                    {currentVersion.change_notes}
                                </span>
                            )}
                        </div>

                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>نافذة كاملة</span>
                        </a>
                    </div>

                    <div className="flex-1 bg-slate-100 flex items-center justify-center p-2 overflow-hidden">
                        {isPdf ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-xl border border-slate-200 bg-white"
                                title={document.title}
                            />
                        ) : isImage ? (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <img
                                    src={previewUrl}
                                    alt={document.title}
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                                />
                            </div>
                        ) : (
                            <div className="text-center p-8 space-y-3">
                                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                                <div className="text-xs font-semibold text-slate-700">
                                    المعاينة المباشرة غير مدعومة لهذا النوع من الملفات
                                </div>
                                {can.download && (
                                    <a
                                        href={`/documents/${document.id}/download`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                                        download
                                    >
                                        <Download className="w-4 h-4" />
                                        تحميل الملف للفتح محلياً
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setActiveTab(t.key)}
                                className={`flex-1 whitespace-nowrap px-3 py-3 text-center transition-colors border-b-2 ${activeTab === t.key
                                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Meta Tab */}
                    {activeTab === 'meta' && (
                        <div className="p-5 divide-y divide-slate-100 text-xs">
                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                    حالة المعاملة:
                                </span>
                                <span
                                    className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${isFinished
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                        }`}
                                >
                                    {isFinished ? 'مكتمل (Finish)' : 'قيد الإجراء (Pending)'}
                                </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                    القسم الأصلي:
                                </span>
                                <span className="font-semibold text-slate-900">{document.department?.name}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                                    المجلد / التصنيف:
                                </span>
                                <span className="font-semibold text-slate-900">{document.category?.name}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    تاريخ المستند:
                                </span>
                                <span className="font-semibold text-slate-900">{document.doc_date}</span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                                    الرافع الأصلي:
                                </span>
                                <span className="font-semibold text-slate-900">
                                    {document.uploader?.name || 'النظام'}
                                </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                                    حجم الملف:
                                </span>
                                <span className="font-mono text-slate-700">
                                    {formatBytes(latestVersion?.file_size)}
                                </span>
                            </div>

                            <div className="py-2.5 flex flex-col gap-1">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                    البصمة الرقمية (SHA-256):
                                </span>
                                <span className="font-mono text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all">
                                    {latestVersion?.file_hash || 'غير متوفر'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="p-4 space-y-4">
                            <form onSubmit={handleCommentSubmit} className="space-y-2">
                                <textarea
                                    value={commentData.body}
                                    onChange={(e) => setCommentData('body', e.target.value)}
                                    rows={3}
                                    placeholder="اكتب تعليقاً أو توجيهاً على المعاملة..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
                                />
                                {commentErrors.body && (
                                    <p className="text-[11px] text-rose-600">{commentErrors.body}</p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={commentProcessing || !commentData.body.trim()}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        {commentProcessing ? 'جارٍ الإرسال...' : 'إضافة تعليق'}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2.5 max-h-[450px] overflow-y-auto">
                                {comments.map((c) => (
                                    <div
                                        key={c.id}
                                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-900">
                                                {c.user?.name || 'مستخدم'}
                                            </span>
                                            <span className="text-slate-400 font-mono">
                                                {c.created_at
                                                    ? new Date(c.created_at).toLocaleString('ar-EG')
                                                    : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 whitespace-pre-line">{c.body}</p>
                                    </div>
                                ))}

                                {comments.length === 0 && (
                                    <div className="text-center py-8 text-xs text-slate-400">لا توجد تعليقات بعد</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recipients / Inter-Department Route */}
                    {activeTab === 'recipients' && (
                        <div className="p-4 space-y-3">
                            <div className="text-xs text-slate-500 pb-2 border-b border-slate-200 flex items-center justify-between">
                                <span>مسار تحويل المستند وحالة وصوله للأقسام</span>
                                <span className="text-indigo-600 font-mono font-bold">
                                    {recipients.length} مستلم
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
                                {recipients.map((r) => (
                                    <div
                                        key={r.id}
                                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                                    >
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                                    #{r.priority}
                                                </span>
                                                <span className="font-semibold text-slate-900 truncate">
                                                    {r.user?.name}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                                <span>{r.department?.name}</span>
                                                {r.sender && (
                                                    <span className="text-slate-400">
                                                        • المحول: {r.sender.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {r.status === 'read' ? (
                                            <span
                                                className="shrink-0 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                                                title={r.read_at ? new Date(r.read_at).toLocaleString('ar-EG') : ''}
                                            >
                                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                                تمت القراءة
                                            </span>
                                        ) : (
                                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                <Clock className="w-3 h-3 text-slate-500" />
                                                لم يُقرأ بعد
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {recipients.length === 0 && (
                                    <div className="text-center py-8 text-xs text-slate-400">
                                        لم يتم تحويل المستند لأي قسم حتى الآن
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Versions */}
                    {activeTab === 'versions' && (
                        <div className="p-4 space-y-3">
                            <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
                                {document.versions?.map((ver) => {
                                    const isCurrent = ver.id === latestVersion?.id;
                                    const isViewingThis = selectedPreviewVersion
                                        ? selectedPreviewVersion.id === ver.id
                                        : isCurrent;

                                    return (
                                        <div
                                            key={ver.id}
                                            className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${isViewingThis
                                                ? 'bg-indigo-50/70 border-indigo-300'
                                                : 'bg-slate-50 border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        v{ver.version_no}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                                            الأحدث
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPreviewVersion(ver)}
                                                        className="px-2.5 py-1 rounded-lg bg-white text-slate-700 hover:text-indigo-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
                                                    >
                                                        معاينة
                                                    </button>
                                                    {can.download && (
                                                        <a
                                                            href={`/documents/${document.id}/versions/${ver.id}/download`}
                                                            className="p-1.5 rounded-lg bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
                                                            title="تحميل"
                                                            download
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-slate-700">
                                                {ver.original_name} •{' '}
                                                <span className="font-mono text-slate-500">
                                                    {formatBytes(ver.file_size)}
                                                </span>
                                            </div>

                                            {ver.change_notes && (
                                                <div className="text-[11px] text-purple-800 bg-purple-50 p-2 rounded-lg border border-purple-200 flex items-start gap-1.5">
                                                    <PenTool className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                                                    <span>{ver.change_notes}</span>
                                                </div>
                                            )}

                                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                                                <span>بواسطة: {ver.uploader?.name || 'مستخدم'}</span>
                                                <span className="font-mono">
                                                    {ver.created_at
                                                        ? new Date(ver.created_at).toLocaleDateString('ar-EG')
                                                        : ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Audit */}
                    {activeTab === 'audit' && isAdmin && (
                        <div className="p-4 divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
                            {document.audit_logs?.map((log) => (
                                <div key={log.id} className="py-2.5 first:pt-0 space-y-1 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-900">
                                            {log.user?.name || 'النظام'}
                                        </span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                            {log.action}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        {log.created_at
                                            ? new Date(log.created_at).toLocaleString('ar-EG')
                                            : ''}
                                    </div>
                                </div>
                            ))}

                            {(!document.audit_logs || document.audit_logs.length === 0) && (
                                <div className="text-center py-8 text-xs text-slate-400">لا توجد حركات مسجلة</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Inter-Department Forward Modal */}
            {forwardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Send className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900">تحويل المعاملة إلى قسم آخر</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForwardModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleForwardSubmit} className="p-5 space-y-4">
                            {/* Department Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    القسم المراد التحويل إليه <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={selectedForwardDeptId}
                                    onChange={(e) => {
                                        setSelectedForwardDeptId(e.target.value);
                                        setSelectedForwardUserIds([]);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                                >
                                    {recipientDepartments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} ({dept.users.length} عضو)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Users Selection */}
                            {currentForwardDept && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <label className="font-semibold text-slate-700">
                                            العضوون المستلمون بالقسم ({currentForwardDept.name})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllDeptUsers}
                                            className="text-indigo-600 hover:text-indigo-700 text-[11px] font-semibold transition-colors"
                                        >
                                            {selectedForwardUserIds.length === currentForwardDept.users.length
                                                ? 'إلغاء تحديد الكل'
                                                : 'تحديد جميع العضوين'}
                                        </button>
                                    </div>

                                    <div className="space-y-1.5 max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 shadow-inner">
                                        {currentForwardDept.users.map((u) => {
                                            const checked = selectedForwardUserIds.includes(u.id);
                                            return (
                                                <label
                                                    key={u.id}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${checked
                                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold shadow-2xs'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => handleToggleForwardUser(u.id)}
                                                        className="accent-indigo-600"
                                                    />
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                                                        #{u.order_num ?? '-'}
                                                    </span>
                                                    <span className="truncate">{u.name}</span>
                                                </label>
                                            );
                                        })}

                                        {currentForwardDept.users.length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400">
                                                لا يوجد عضوون نشطون في هذا القسم حالياً
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        * إذا لم تحدد عضوين بعينهم، سيتم تحويل المعاملة لكافة عضوي القسم.
                                    </p>
                                </div>
                            )}

                            {/* Note / Directive */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                    ملاحظات أو توجيه التحويل (اختياري)
                                </label>
                                <textarea
                                    value={forwardNote}
                                    onChange={(e) => setForwardNote(e.target.value)}
                                    rows={3}
                                    placeholder="اكتب التوجيه أو سبب التحويل ليظهر في سجل المعاملة..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setForwardModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={forwardSubmitting || !selectedForwardDeptId}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
                                >
                                    {forwardSubmitting ? 'جارٍ التحويل...' : 'تحويل المعاملة الآن'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Document Signature Modal */}
            {signModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
                    <div
                        className={`w-full ${signStep === 'place' ? 'max-w-3xl' : 'max-w-lg'
                            } max-h-[95vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl`}
                    >
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-bold text-white">
                                    {signStep === 'source'
                                        ? 'توقيع واعتماد المستند إلكترونياً'
                                        : 'اسحب التوقيع إلى المكان المناسب'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => !signProcessing && setSignModalOpen(false)}
                                className="text-slate-500 hover:text-indigo-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {signProcessing ? (
                            <div className="p-10 text-center space-y-4">
                                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-white">{signProcessingMsg}</h4>
                                    <p className="text-xs text-slate-500">يرجى الانتظار قليلاً...</p>
                                </div>
                            </div>
                        ) : signStep === 'source' ? (
                            /* ---------- Step 1: choose the signature ---------- */
                            <div className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        مصدر التوقيع
                                    </label>
                                    <div className="flex rounded-xl bg-slate-150 border border-slate-200 p-1 gap-1 text-xs font-semibold">
                                        {hasSignature && (
                                            <button
                                                type="button"
                                                onClick={() => setSignSource('profile')}
                                                className={`flex-1 py-2 rounded-lg transition-colors ${signSource === 'profile'
                                                    ? 'bg-purple-600 text-white shadow'
                                                    : 'text-slate-500 hover:text-slate-200'
                                                    }`}
                                            >
                                                توقيعي المحفوظ
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setSignSource('draw')}
                                            className={`flex-1 py-2 rounded-lg transition-colors ${signSource === 'draw'
                                                ? 'bg-purple-600 text-white shadow'
                                                : 'text-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            رسم توقيع جديد
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSignSource('upload')}
                                            className={`flex-1 py-2 rounded-lg transition-colors ${signSource === 'upload'
                                                ? 'bg-purple-600 text-white shadow'
                                                : 'text-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            رفع صورة توقيع
                                        </button>
                                    </div>
                                </div>

                                {signSource === 'profile' && userSignatureUrl && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-300 flex items-center justify-center min-h-[90px]">
                                        <img
                                            src={userSignatureUrl}
                                            alt="توقيعك المحفوظ"
                                            className="max-h-20 max-w-full object-contain"
                                        />
                                    </div>
                                )}

                                {signSource === 'draw' && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>ارسم توقيعك بالقلم أدناه:</span>
                                            <button
                                                type="button"
                                                onClick={() => signCanvasRef.current?.clear()}
                                                className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                                            >
                                                <Eraser className="w-3 h-3" />
                                                <span>مسح</span>
                                            </button>
                                        </div>
                                        <div className="rounded-xl border border-slate-300 bg-white p-1">
                                            <SignatureCanvas
                                                ref={signCanvasRef}
                                                penColor="#0f172a"
                                                minWidth={1.2}
                                                maxWidth={2.8}
                                                canvasProps={{
                                                    className: 'w-full h-36 rounded-lg cursor-crosshair touch-none',
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {signSource === 'upload' && (
                                    <div className="space-y-1.5">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => setUploadedSignFile(e.target.files?.[0] || null)}
                                            className="w-full bg-slate-150 border border-slate-300 rounded-xl px-3 py-2 text-xs text-white"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setSignModalOpen(false)}
                                        className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-indigo-900 hover:bg-slate-100"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGoToPlacement}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-colors"
                                    >
                                        <Move className="w-4 h-4" />
                                        <span>التالي: تحديد مكان التوقيع</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ---------- Step 2: free placement on the document ---------- */
                            <form onSubmit={handleApplySignature} className="p-5 space-y-4">
                                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <Move className="w-3.5 h-3.5 text-purple-400" />
                                    اسحب التوقيع بالماوس أو بإصبعك إلى أي مكان تريده على المستند.
                                </p>

                                {/* PDF page navigation */}
                                {isPdf && numPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 text-xs text-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                                            disabled={pageNum <= 1}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <span className="font-mono">
                                            صفحة {pageNum} / {numPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
                                            disabled={pageNum >= numPages}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Document + draggable signature */}
                                <div className="rounded-xl border border-slate-200 bg-slate-150 p-3 max-h-[60vh] overflow-auto">
                                    <div ref={wrapperRef} className="relative mx-auto w-fit max-w-full" dir="ltr">
                                        {isPdf ? (
                                            <canvas
                                                ref={pageCanvasRef}
                                                className="block bg-white shadow-lg"
                                                style={{ maxWidth: '100%', height: 'auto' }}
                                            />
                                        ) : (
                                            <img
                                                src={previewUrl}
                                                alt={document.title}
                                                draggable={false}
                                                className="block max-w-full shadow-lg select-none"
                                            />
                                        )}

                                        {isPdf && pageLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-150/60">
                                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                            </div>
                                        )}

                                        {signatureOverlay}
                                    </div>
                                </div>

                                {/* Size slider */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <label className="font-semibold text-slate-700">حجم التوقيع</label>
                                        <span className="font-mono text-slate-500">{Math.round(sigW * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0.08}
                                        max={0.6}
                                        step={0.01}
                                        value={sigW}
                                        onChange={(e) => handleSizeChange(Number(e.target.value))}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* Finish Document Checkbox */}
                                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-150 border border-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={signMarkFinish}
                                        onChange={(e) => setSignMarkFinish(e.target.checked)}
                                        className="w-4 h-4 accent-purple-600 rounded"
                                    />
                                    <div className="text-xs">
                                        <span className="font-semibold text-white block">
                                            إنهاء المعاملة وتحديدها كمكتملة (Finish)
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                            تعليم حالة المستند كمكتمل بعد التوقيع والاعتماد.
                                        </span>
                                    </div>
                                </label>

                                {/* Optional Signer Note */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        ملاحظات الاعتماد (اختياري)
                                    </label>
                                    <input
                                        type="text"
                                        value={signNote}
                                        onChange={(e) => setSignNote(e.target.value)}
                                        placeholder="مثال: تم المراجعة والاعتماد بعد استيفاء الشروط..."
                                        className="w-full bg-slate-150 border border-slate-300 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setSignStep('source')}
                                        className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-indigo-900 hover:bg-slate-100"
                                    >
                                        رجوع
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSignModalOpen(false)}
                                            className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-indigo-900 hover:bg-slate-100"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>توقيع وحفظ المستند</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Share Modal (admin only) */}
            {isAdmin && (
                <ShareModal
                    document={document}
                    shareableUsers={shareableUsers}
                    isOpen={shareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                />
            )}
        </AppLayout>
    );
}