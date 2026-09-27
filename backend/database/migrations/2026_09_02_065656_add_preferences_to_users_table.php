<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('dark_mode')
                ->default(false)
                ->after('profile_photo');

            $table->boolean('notifications_enabled')
                ->default(true)
                ->after('dark_mode');

            $table->boolean('case_updates')
                ->default(true)
                ->after('notifications_enabled');

            $table->boolean('system_notifications')
                ->default(true)
                ->after('case_updates');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'dark_mode',
                'notifications_enabled',
                'case_updates',
                'system_notifications',
            ]);
        });
    }
};