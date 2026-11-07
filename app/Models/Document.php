<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'reference_no',
        'doc_date',
        'type_id',
        'category_id',
        'department_id',
        'uploaded_by',
        'status',
    ];

    protected $casts = [
        'doc_date' => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'type_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version_no');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(DocumentVersion::class)->latestOfMany('version_no');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DocumentFile::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'document_tags');
    }

    public function accessList(): HasMany
    {
        return $this->hasMany(DocumentAccess::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class)->orderByDesc('id');
    }

    /**
     * Scope accessible by a given user based on department or shared access
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($user) {
            if ($user->department_id) {
                $q->where('department_id', $user->department_id);
            }
            $q->orWhereHas('accessList', function (Builder $accessQuery) use ($user) {
                $accessQuery->where('user_id', $user->id);
            });
        });
    }

    /**
     * Search scope by keyword or reference_no
     */
    public function scopeSearch(Builder $query, ?string $search): Builder
    {
        if (!$search) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
              ->orWhere('reference_no', 'like', "%{$search}%")
              ->orWhereHas('tags', function (Builder $tq) use ($search) {
                  $tq->where('name', 'like', "%{$search}%");
              });
        });
    }
}
