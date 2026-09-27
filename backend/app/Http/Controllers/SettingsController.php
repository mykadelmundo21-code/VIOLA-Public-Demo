<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private function userData($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'contact' => $user->phone,
            'role' => $user->role,

            'photo' => $user->profile_photo
                ? Storage::url($user->profile_photo)
                : null,

            'dark_mode' => (bool) $user->dark_mode,

            'notifications_enabled' =>
                (bool) $user->notifications_enabled,

            'case_updates' =>
                (bool) $user->case_updates,

            'system_notifications' =>
                (bool) $user->system_notifications,
        ];
    }

    public function profile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->userData($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email,' . $user->id,
            ],

            'contact' => [
                'nullable',
                'string',
                'max:20',
            ],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->phone = $validated['contact'] ?? null;

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->userData($user),
        ]);
    }

    public function updatePhoto(Request $request)
    {
        $request->validate([
            'photo' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        $user = $request->user();

        if (
            $user->profile_photo &&
            Storage::disk('public')->exists(
                $user->profile_photo
            )
        ) {
            Storage::disk('public')->delete(
                $user->profile_photo
            );
        }

        $path = $request
            ->file('photo')
            ->store(
                'profile-photos',
                'public'
            );

        $user->profile_photo = $path;

        $user->save();

        return response()->json([
            'message' =>
                'Profile picture updated successfully.',
            'user' => $this->userData($user),
        ]);
    }

    public function updatePreferences(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'dark_mode' => [
                'required',
                'boolean',
            ],

            'notifications_enabled' => [
                'required',
                'boolean',
            ],

            'case_updates' => [
                'required',
                'boolean',
            ],

            'system_notifications' => [
                'required',
                'boolean',
            ],
        ]);

        $user->dark_mode =
            $validated['dark_mode'];

        $user->notifications_enabled =
            $validated['notifications_enabled'];

        $user->case_updates =
            $validated['case_updates'];

        $user->system_notifications =
            $validated['system_notifications'];

        $user->save();

        return response()->json([
            'message' =>
                'Preferences updated successfully.',
            'user' => $this->userData($user),
        ]);
    }
}