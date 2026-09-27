<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('violations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
                ->constrained('students')
                ->cascadeOnDelete();

            $table->foreignId('violation_type_id')
                ->constrained('violation_types')
                ->restrictOnDelete();

            $table->foreignId('reported_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->dateTime('incident_at');
            $table->string('location')->nullable();
            $table->text('description')->nullable();

            $table->enum('status', [
                'reported',
                'under_review',
                'resolved',
                'closed'
            ])->default('reported');

            $table->timestamps();

            $table->index(['student_id', 'incident_at']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
