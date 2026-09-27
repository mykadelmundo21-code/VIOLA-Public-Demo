<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,

            'profile_photo' => $user->profile_photo
                ? \Storage::url($user->profile_photo)
                : null,

            'dark_mode' => (bool) $user->dark_mode,
            'notifications_enabled' =>
                (bool) $user->notifications_enabled,
            'case_updates' =>
                (bool) $user->case_updates,
            'system_notifications' =>
                (bool) $user->system_notifications,
            'must_change_password' =>
                (bool) $user->must_change_password,
        ];
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $email = strtolower(trim($validated['email']));

        $user = User::where(
            'email',
            $email
        )->first();

        if (
            !$user ||
            !Hash::check(
                $validated['password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' =>
                    'The email or password you entered is incorrect.',
            ], 401);
        }

        $token = $user
            ->createToken('viola-web')
            ->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->userData($user),
        ]);
    }

    public function logout(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if ($user) {
            $user
                ->currentAccessToken()
                ?->delete();
        }

        return response()->json([
            'message' =>
                'Logged out successfully.',
        ]);
    }

    public function me(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        return response()->json([
            'user' => $this->userData($user),
        ]);
    }

    public function changePassword(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'current_password' => [
                'required',
                'string',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (
            !Hash::check(
                $validated['current_password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' =>
                    'The current password is incorrect.',
            ], 422);
        }

        if (
            Hash::check(
                $validated['password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' =>
                    'Your new password must be different from your current password.',
            ], 422);
        }

        $user->password = Hash::make(
            $validated['password']
        );

        $user->must_change_password = false;

        $user->save();

        return response()->json([
            'message' =>
                'Password changed successfully.',
            'user' => $this->userData($user),
        ]);
    }

    public function forgotPassword(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
            ],
        ]);

        $email = strtolower(
            trim($validated['email'])
        );

        $user = User::where(
            'email',
            $email
        )->first();

        if (!$user) {
            return response()->json([
                'message' =>
                    'If the email is registered, a password reset code has been sent.',
            ]);
        }

        DB::table('password_reset_codes')
            ->where('email', $email)
            ->whereNull('used_at')
            ->delete();

        $code = (string) random_int(
            100000,
            999999
        );

        DB::table('password_reset_codes')->insert([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Mail::to($email)->send(
            new PasswordResetCodeMail($code)
        );

        return response()->json([
            'message' =>
                'If the email is registered, a password reset code has been sent.',
        ]);
    }

    public function resetPassword(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
            ],

            'code' => [
                'required',
                'digits:6',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $email = strtolower(
            trim($validated['email'])
        );

        $resetCode = DB::table(
            'password_reset_codes'
        )
            ->where('email', $email)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$resetCode) {
            return response()->json([
                'message' =>
                    'Invalid or expired reset code.',
            ], 422);
        }

        if (
            now()->greaterThan(
                $resetCode->expires_at
            )
        ) {
            return response()->json([
                'message' =>
                    'This reset code has expired. Please request a new code.',
            ], 422);
        }

        if (
            !Hash::check(
                $validated['code'],
                $resetCode->code_hash
            )
        ) {
            return response()->json([
                'message' =>
                    'The reset code is incorrect.',
            ], 422);
        }

        $user = User::where(
            'email',
            $email
        )->first();

        if (!$user) {
            return response()->json([
                'message' =>
                    'Unable to reset this account.',
            ], 404);
        }

        $user->password = Hash::make(
            $validated['password']
        );

        $user->must_change_password = false;

        $user->save();

        DB::table('password_reset_codes')
            ->where('id', $resetCode->id)
            ->update([
                'used_at' => now(),
                'updated_at' => now(),
            ]);

        $user->tokens()->delete();

        return response()->json([
            'message' =>
                'Your password has been reset successfully.',
        ]);
    }
}