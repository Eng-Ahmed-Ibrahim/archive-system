<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentFileController extends Controller
{
    /**
     * Download the latest version of the document
     */
    public function download(Request $request, Document $document): StreamedResponse
    {
        $user = $request->user();
        Gate::authorize('download', $document);

        $version = $document->latestVersion;
        if (!$version || !Storage::disk('local')->exists($version->file_path)) {
            abort(404, 'الملف غير متوفر على وحدة التخزين.');
        }

        AuditService::log('download', $document, [
            'version_no' => $version->version_no,
            'file_name' => $version->original_name,
            'file_hash' => $version->file_hash,
            'file_size' => $version->file_size,
        ], $user);

        return Storage::disk('local')->download($version->file_path, $version->original_name);
    }

    /**
     * Preview the document inline (PDF, Image, Text)
     */
    public function preview(Request $request, Document $document, ?DocumentVersion $version = null)
    {
        $user = $request->user();
        Gate::authorize('view', $document);

        $targetVersion = $version && (int) $version->document_id === (int) $document->id
            ? $version
            : $document->latestVersion;

        if (!$targetVersion || !Storage::disk('local')->exists($targetVersion->file_path)) {
            abort(404, 'الملف المطلوب للمعاينة غير متوفر.');
        }

        AuditService::log('view', $document, [
            'version_no' => $targetVersion->version_no,
            'file_name' => $targetVersion->original_name,
        ], $user);

        $fullPath = Storage::disk('local')->path($targetVersion->file_path);

        return response()->file($fullPath, [
            'Content-Type' => $targetVersion->mime_type,
            'Content-Disposition' => 'inline; filename="' . addslashes($targetVersion->original_name) . '"',
            'Cache-Control' => 'no-cache, private',
        ]);
    }
}
