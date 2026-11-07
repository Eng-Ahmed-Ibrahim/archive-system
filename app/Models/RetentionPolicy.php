<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RetentionPolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'type_id',
        'retention_years',
        'after_action',
    ];

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'type_id');
    }
}
