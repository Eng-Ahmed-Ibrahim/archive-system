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
        'direction',
        'status',
        'subject_id'
    ];

    protected $casts = [
        'doc_date' => 'date',
    ];
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($user) {
            $q->where('uploaded_by', $user->id)
                ->orWhereHas('recipients', fn($r) => $r->where('user_id', $user->id))
                ->orWhereHas('accessList', fn($a) => $a->where('user_id', $user->id));
        });
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
    public function comments(): HasMany
    {
        return $this->hasMany(DocumentComment::class)->oldest();
    }
    public function recipients(): HasMany
    {
        return $this->hasMany(DocumentRecipient::class);
    }
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
