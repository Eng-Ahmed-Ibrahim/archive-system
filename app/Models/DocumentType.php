<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DocumentType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'type_id');
    }

    public function retentionPolicy(): HasOne
    {
        return $this->hasOne(RetentionPolicy::class, 'type_id');
    }
}
