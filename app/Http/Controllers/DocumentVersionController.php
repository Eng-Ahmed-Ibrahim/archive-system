<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Services\AuditService;
use App\Services\DocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentVersionController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    /**
     * Upload a new version for a document
     */
    public function store(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();
        Gate::authorize('addVersion', $document);

        $request->validate([
            'file' => ['required', 'file', 'max:51200'],
            'change_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $this->documentService->uploadNewVersion(
            $document,
            $request->file('file'),
            $request->input('change_notes'),
            $user
        );

        return back()->with('success', 'تم رفع الإصدار الجديد بنجاح.');
    }

    /**
     * Download a specific version of a document
     */
    public function download(Request $request, Document $document, DocumentVersion $version): StreamedResponse
    {
        $user = $request->user();
        Gate::authorize('download', $document);

        if ((int) $version->document_id !== (int) $document->id) {
            abort(404);
        }

        if (!Storage::disk('local')->exists($version->file_path)) {
            abort(404, 'الملف غير موجود على وحدة التخزين.');
        }

        AuditService::log('download_version', $document, [
            'version_no' => $version->version_no,
            'file_name' => $version->original_name,
            'file_hash' => $version->file_hash,
        ], $user);

        return Storage::disk('local')->download($version->file_path, $version->original_name);
    }
}
