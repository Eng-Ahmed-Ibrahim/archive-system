<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('documents.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('documents.view')) {
            return false;
        }

        // Same department
        if ($user->department_id && (int) $user->department_id === (int) $document->department_id) {
            return true;
        }

        // Shared directly with user
        return $document->accessList()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('documents.upload');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('documents.upload')) {
            return false;
        }

        if ($user->department_id && (int) $user->department_id === (int) $document->department_id) {
            return true;
        }

        return $document->accessList()
            ->where('user_id', $user->id)
            ->where('access_level', 'edit')
            ->exists();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('documents.delete')) {
            return false;
        }

        return $user->department_id && (int) $user->department_id === (int) $document->department_id;
    }

    /**
     * Determine whether the user can download the document.
     */
    public function download(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('documents.download')) {
            return false;
        }

        if ($user->department_id && (int) $user->department_id === (int) $document->department_id) {
            return true;
        }

        return $document->accessList()
            ->where('user_id', $user->id)
            ->whereIn('access_level', ['download', 'edit'])
            ->exists();
    }

    /**
     * Determine whether the user can upload a new version.
     */
    public function addVersion(User $user, Document $document): bool
    {
        return $this->update($user, $document);
    }

    /**
     * Determine whether the user can share the document.
     */
    public function share(User $user, Document $document): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('documents.share')) {
            return false;
        }

        return $user->department_id && (int) $user->department_id === (int) $document->department_id;
    }
}
