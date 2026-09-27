<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'contact',
        'grade_level',
        'section',
        'school_year',
        'status',
        'teacher_id',
    ];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'parent_students',
            'student_id',
            'parent_id'
        )->withTimestamps();
    }

    public function parentInformation(): HasOne
    {
        return $this->hasOne(ParentInformation::class);
    }
}