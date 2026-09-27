<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterventionHistory extends Model
{
    protected $fillable = [
        'intervention_id',
        'modified_by',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function intervention(): BelongsTo
    {
        return $this->belongsTo(
            Intervention::class,
            'intervention_id'
        );
    }

    public function modifiedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'modified_by'
        );
    }
}