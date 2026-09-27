<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Violation extends Model
{
    protected $fillable = [
        'student_id',
        'violation_type_id',
        'reported_by',
        'incident_at',
        'location',
        'description',
        'status',
    ];

    protected $casts = [
        'incident_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function violationType(): BelongsTo
    {
        return $this->belongsTo(
            ViolationType::class
        );
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'reported_by'
        );
    }

    public function interventions(): HasMany
    {
        return $this->hasMany(
            Intervention::class
        );
    }
}