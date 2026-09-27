<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class SemaphoreService
{
    private string $apiUrl = 'https://api.semaphore.co/api/v4/messages';

    public function send(string $number, string $message): array
    {
        $apiKey = config('services.semaphore.api_key');
        $senderName = config('services.semaphore.sender_name', 'VIOLA');

        if (!$apiKey) {
            throw new RuntimeException('Semaphore API key is not configured.');
        }

        $response = Http::asForm()
            ->timeout(30)
            ->post($this->apiUrl, [
                'apikey' => $apiKey,
                'number' => $this->normalizeNumber($number),
                'message' => $message,
                'sendername' => $senderName,
            ]);

        if ($response->failed()) {
            throw new RuntimeException(
                'Semaphore API error: ' . $response->body()
            );
        }

        $data = $response->json();

        if (!is_array($data)) {
            throw new RuntimeException('Invalid response from Semaphore.');
        }

        if (
            isset($data[0]['status']) &&
            strtolower((string) $data[0]['status']) === 'failed'
        ) {
            throw new RuntimeException(
                'Semaphore rejected the SMS: ' .
                ($data[0]['message'] ?? 'Unknown error.')
            );
        }

        return $data;
    }

    private function normalizeNumber(string $number): string
    {
        $number = preg_replace('/[^0-9]/', '', $number);

        if (str_starts_with($number, '09')) {
            return '63' . substr($number, 1);
        }

        if (str_starts_with($number, '9') && strlen($number) === 10) {
            return '63' . $number;
        }

        if (str_starts_with($number, '63')) {
            return $number;
        }

        throw new RuntimeException('Invalid Philippine mobile number.');
    }
}