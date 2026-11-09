<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    /**
     * Store an uploaded document with initial version
     */
    public function uploadDocument(array $data, UploadedFile $file, User $user): Document
    {
        return DB::transaction(function () use ($data, $file, $user) {
            $yearMonth = date('Y/m');
            $extension = $file->getClientOriginalExtension();
            $storedName = Str::uuid() . ($extension ? '.' . $extension : '');
            $filePath = $file->storeAs("documents/{$yearMonth}", $storedName, 'local');

            $fileHash = hash_file('sha256', $file->getRealPath());
            $fileSize = $file->getSize();
            $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
            $originalName = $file->getClientOriginalName();

            // Auto-generate reference number if not provided
            $referenceNo = !empty($data['reference_no'])
                ? $data['reference_no']
                : 'REF-' . date('Ymd') . '-' . strtoupper(Str::random(5));

            $document = Document::create([
                'title' => $data['title'],
                'reference_no' => $referenceNo,
                'doc_date' => $data['doc_date'] ?? now()->toDateString(),
                'type_id' => $data['type_id'] ?? null,
                'category_id' => $data['category_id'],
                'department_id' => $data['department_id'],
                'uploaded_by' => $user->id,
                'status' => $data['status'] ?? 'active',
                'subject_id'=>$data['subject_id']
            ]);

            $version = DocumentVersion::create([
                'document_id' => $document->id,
                'version_no' => 1,
                'file_path' => $filePath,
                'original_name' => $originalName,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'file_hash' => $fileHash,
                'change_notes' => $data['change_notes'] ?? 'الإصدار الأول عند الرفع',
                'uploaded_by' => $user->id,
            ]);

            // Sync tags if present
            if (!empty($data['tags'])) {
                $tagNames = is_array($data['tags'])
                    ? $data['tags']
                    : array_filter(array_map('trim', explode(',', $data['tags'])));

                $tagIds = [];
                foreach ($tagNames as $name) {
                    if ($name) {
                        $tag = Tag::firstOrCreate(['name' => $name]);
                        $tagIds[] = $tag->id;
                    }
                }
                $document->tags()->sync($tagIds);
            }

            AuditService::log('upload', $document, [
                'version' => 1,
                'original_name' => $originalName,
                'file_size' => $fileSize,
                'file_hash' => $fileHash,
            ], $user);

            return $document->load(['department', 'category', 'type', 'latestVersion', 'tags']);
        });
    }

    /**
     * Upload a new version for an existing document
     */
    public function uploadNewVersion(Document $document, UploadedFile $file, ?string $changeNotes, User $user): DocumentVersion
    {
        return DB::transaction(function () use ($document, $file, $changeNotes, $user) {
            $yearMonth = date('Y/m');
            $extension = $file->getClientOriginalExtension();
            $storedName = Str::uuid() . ($extension ? '.' . $extension : '');
            $filePath = $file->storeAs("documents/{$yearMonth}", $storedName, 'local');

            $fileHash = hash_file('sha256', $file->getRealPath());
            $fileSize = $file->getSize();
            $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
            $originalName = $file->getClientOriginalName();

            $nextVersionNo = ($document->versions()->max('version_no') ?? 0) + 1;

            $version = DocumentVersion::create([
                'document_id' => $document->id,
                'version_no' => $nextVersionNo,
                'file_path' => $filePath,
                'original_name' => $originalName,
                'file_size' => $fileSize,
                'mime_type' => $mimeType,
                'file_hash' => $fileHash,
                'change_notes' => $changeNotes ?: "تحديث إصدار جديد #{$nextVersionNo}",
                'uploaded_by' => $user->id,
            ]);

            AuditService::log('new_version', $document, [
                'version_no' => $nextVersionNo,
                'original_name' => $originalName,
                'file_size' => $fileSize,
                'file_hash' => $fileHash,
                'change_notes' => $changeNotes,
            ], $user);

            return $version;
        });
    }
}
