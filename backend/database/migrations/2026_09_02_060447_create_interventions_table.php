<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interventions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
                ->constrained('students')
                ->cascadeOnDelete();

            $table->foreignId('violation_id')
                ->constrained('violations')
                ->cascadeOnDelete();

            $table->foreignId('recorded_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('intervention_type');

            $table->text('reason')->nullable();

            $table->date('start_date');
            $table->date('follow_up_date')->nullable();

            $table->enum('status', [
                'scheduled',
                'active',
                'completed'
            ])->default('scheduled');

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('student_id');
            $table->index('violation_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interventions');
    }
};