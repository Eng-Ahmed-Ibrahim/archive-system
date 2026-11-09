<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subject extends Model
{
    protected $guarded = [];
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
