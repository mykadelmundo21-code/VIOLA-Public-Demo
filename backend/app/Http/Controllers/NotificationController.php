<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $notifications = Notification::where(
            'user_id',
            $user->id
        )
            ->latest()
            ->take(20)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => (string) $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'time' => $notification->created_at,
                    'type' => $notification->type,
                    'violationId' => $notification->violation_id,
                    'status' => $notification->status,
                    'read_at' => $notification->read_at,
                    'read' => $notification->read_at !== null,
                ];
            });

        return response()->json([
            'role' => $user->role,

            'settings' => [
                'enabled' => (bool) $user->notifications_enabled,
                'case_updates' => (bool) $user->case_updates,
                'system_notifications' => (bool) $user->system_notifications,
            ],

            'notifications' => $notifications->values(),
        ]);
    }

    public function markAsRead(
        Request $request,
        Notification $notification
    ): JsonResponse {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ((int) $notification->user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        if (!$notification->read_at) {
            $notification->update([
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'data' => [
                'id' => (string) $notification->id,
                'read_at' => $notification->read_at,
                'read' => true,
            ],
        ]);
    }

    public function markAllAsRead(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        Notification::where(
            'user_id',
            $user->id
        )
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    }
}