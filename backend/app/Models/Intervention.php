<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Intervention extends Model
{
    protected $fillable = [
        'student_id',
        'violation_id',
        'recorded_by',
        'intervention_type',
        'reason',
        'start_date',
        'follow_up_date',
        'status',
        'parent_contact_required',
        'parent_contact_method',
        'parent_contact_status',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'follow_up_date' => 'date',
        'parent_contact_required' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function violation(): BelongsTo
    {
        return $this->belongsTo(Violation::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(
            InterventionHistory::class,
            'intervention_id'
        )->with('modifiedBy')->latest();
    }
}