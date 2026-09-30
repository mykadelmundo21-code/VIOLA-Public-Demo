<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Guidance account
        User::updateOrCreate(
            ['email' => 'guidance@viola.edu'],
            [
                'name' => 'Guidance Administrator',
                'password' => Hash::make('Guidance123!'),
                'role' => 'guidance',
                'phone' => null,
                'email_verified_at' => now(),
            ]
        );

        // Teacher account
        User::updateOrCreate(
            ['email' => 'teacher@viola.edu'],
            [
                'name' => 'Test Teacher',
                'password' => Hash::make('Teacher123!'),
                'role' => 'teacher',
                'phone' => null,
                'email_verified_at' => now(),
            ]
        );

        // Parent account
        User::updateOrCreate(
            ['email' => 'parent@viola.edu'],
            [
                'name' => 'Test Parent',
                'password' => Hash::make('Parent123!'),
                'role' => 'parent',
                'phone' => null,
                'email_verified_at' => now(),
            ]
        );
    }
}