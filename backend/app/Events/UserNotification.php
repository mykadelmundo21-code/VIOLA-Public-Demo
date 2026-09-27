<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserNotification implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public Notification $notification;

    public function __construct(
        public int $userId,
        public string $title,
        public string $message,
        public string $type = 'system',
        public ?int $violationId = null,
        public ?string $status = null,
    ) {
        $this->notification = Notification::create([
            'user_id' => $this->userId,
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'violation_id' => $this->violationId,
            'status' => $this->status,
        ]);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(
                'App.Models.User.' . $this->userId
            ),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => (string) $this->notification->id,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'type' => $this->notification->type,
            'violationId' => $this->notification->violation_id,
            'status' => $this->notification->status,
            'time' => $this->notification->created_at?->toISOString(),
            'read_at' => $this->notification->read_at?->toISOString(),
        ];
    }
}