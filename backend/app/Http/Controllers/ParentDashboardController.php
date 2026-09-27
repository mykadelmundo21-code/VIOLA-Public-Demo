<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $parent = $request->user();

        if ($parent->role !== 'parent') {
            return response()->json([
                'message' => 'Only parent accounts can access this resource.',
            ], 403);
        }

        $student = $parent->children()
            ->with([
                'violations' => function ($query) {
                    $query
                        ->with('violationType')
                        ->orderByDesc('incident_at');
                },
            ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->first();

        if (!$student) {
            return response()->json([
                'student' => null,
                'statistics' => [
                    'total_violations' => 0,
                    'under_review' => 0,
                    'resolved' => 0,
                ],
                'recent_violations' => [],
            ]);
        }

        $violations = $student->violations;

        $recentViolations = $violations
            ->take(5)
            ->map(function ($violation) {
                return [
                    'id' => $violation->id,
                    'type' => $violation->violationType?->name
                        ?? 'Violation',
                    'date' => $violation->incident_at
                        ? $violation->incident_at->format('M d, Y')
                        : 'No date',
                    'status' => match ($violation->status) {
                        'reported' => 'For Review',
                        'under_review' => 'Under Review',
                        'resolved' => 'Resolved',
                        'closed' => 'Closed',
                        default => ucfirst(
                            str_replace(
                                '_',
                                ' ',
                                $violation->status
                            )
                        ),
                    },
                ];
            })
            ->values();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => trim(
                    $student->first_name . ' ' .
                    ($student->middle_name
                        ? $student->middle_name . ' '
                        : '') .
                    $student->last_name
                ),
                'student_id' => $student->student_id,
                'grade' => $student->grade_level,
                'section' => $student->section,
                'school_year' => $student->school_year,
                'status' => $student->status,
            ],

            'statistics' => [
                'total_violations' => $violations->count(),

                'under_review' => $violations
                    ->whereIn('status', [
                        'reported',
                        'under_review',
                    ])
                    ->count(),

                'resolved' => $violations
                    ->whereIn('status', [
                        'resolved',
                        'closed',
                    ])
                    ->count(),
            ],

            'recent_violations' => $recentViolations,
        ]);
    }
}