<?php

namespace App\Http\Controllers;

use App\Models\Intervention;
use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuidanceAssessmentController extends Controller
{
    public function suggestions(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.'
            ], 403);
        }

        $students = Student::with([
            'violations.violationType',
        ])
            ->where('status', 'active')
            ->get();

        $suggestions = collect();

        foreach ($students as $student) {
            $violations = $student->violations
                ->sortByDesc('incident_at')
                ->values();

            $violationCount = $violations->count();

            if ($violationCount < 2) {
                continue;
            }

            $latestViolation = $violations->first();

            if (!$latestViolation) {
                continue;
            }

            $suggestion = $violationCount >= 3
                ? 'assessment_and_parent'
                : 'assessment';

            $reason = $violationCount >= 3
                ? 'The student has multiple recorded violations. Further assessment and parent involvement may be considered.'
                : 'The student has repeated violation records. A student assessment may be considered.';

            $suggestions->push([
                'id' => $latestViolation->id,
                'studentId' => $student->student_id,
                'studentName' => trim(
                    $student->first_name . ' ' .
                    ($student->middle_name
                        ? $student->middle_name . ' '
                        : '') .
                    $student->last_name
                ),
                'gradeLevel' => $student->grade_level,
                'section' => $student->section,
                'violationType' =>
                    $latestViolation->violationType?->name ?? 'Unknown',
                'violationCount' => $violationCount,
                'reason' => $reason,
                'suggestion' => $suggestion,
                'createdAt' =>
                    $latestViolation->created_at?->toISOString(),
            ]);
        }

        return response()->json([
            'data' => $suggestions
                ->sortByDesc('violationCount')
                ->values(),
        ]);
    }

    public function review(
        Request $request,
        int $violationId
    ): JsonResponse {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.'
            ], 403);
        }

        $violation = Violation::with([
            'student',
            'violationType',
            'reportedBy',
        ])->find($violationId);

        if (!$violation) {
            return response()->json([
                'message' => 'Violation record not found.'
            ], 404);
        }

        $student = $violation->student;

        if (!$student) {
            return response()->json([
                'message' => 'Student record not found.'
            ], 404);
        }

        $allViolations = Violation::with([
            'violationType',
            'reportedBy',
        ])
            ->where('student_id', $student->id)
            ->orderByDesc('incident_at')
            ->orderByDesc('id')
            ->get();

        $interventions = Intervention::with([
            'violation.violationType',
            'recordedBy',
        ])
            ->where('student_id', $student->id)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();

        $violationCount = $allViolations->count();

        $suggestion = $violationCount >= 3
            ? 'assessment_and_parent'
            : 'assessment';

        $reason = $violationCount >= 3
            ? 'The student has multiple recorded violations. Further assessment and parent involvement may be considered.'
            : 'The student has repeated violation records. A student assessment may be considered.';

        $studentName = trim(
            $student->first_name . ' ' .
            ($student->middle_name
                ? $student->middle_name . ' '
                : '') .
            $student->last_name
        );

        $violations = $allViolations
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'violationType' =>
                        $item->violationType?->name ?? 'Unknown',
                    'category' =>
                        $item->violationType?->category,
                    'incidentAt' =>
                        $item->incident_at?->format('M d, Y h:i A'),
                    'location' => $item->location,
                    'description' => $item->description,
                    'reportedBy' =>
                        $item->reportedBy?->name ?? 'Unknown',
                    'reportedByEmail' =>
                        $item->reportedBy?->email,
                    'status' => $item->status,
                ];
            })
            ->values();

        $interventionData = $interventions
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'violationId' => $item->violation_id,
                    'violationType' =>
                        $item->violation?->violationType?->name ?? 'Unknown',
                    'interventionType' =>
                        $item->intervention_type,
                    'reason' => $item->reason,
                    'startDate' =>
                        $item->start_date?->format('M d, Y'),
                    'followUpDate' =>
                        $item->follow_up_date?->format('M d, Y'),
                    'status' => $item->status,
                    'parentContactRequired' =>
                        (bool) $item->parent_contact_required,
                    'parentContactMethod' =>
                        $item->parent_contact_method,
                    'parentContactStatus' =>
                        $item->parent_contact_status,
                    'assignedTo' =>
                        $item->recordedBy?->name ?? 'Guidance',
                    'notes' => $item->notes,
                    'createdAt' =>
                        $item->created_at?->format('M d, Y h:i A'),
                    'updatedAt' =>
                        $item->updated_at?->format('M d, Y h:i A'),
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'id' => $violation->id,

                'student' => [
                    'id' => $student->id,
                    'studentId' => $student->student_id,
                    'name' => $studentName,
                    'firstName' => $student->first_name,
                    'middleName' => $student->middle_name,
                    'lastName' => $student->last_name,
                    'gradeLevel' => $student->grade_level,
                    'section' => $student->section,
                    'schoolYear' => $student->school_year,
                    'status' => $student->status,
                ],

                'currentViolation' => [
                    'id' => $violation->id,
                    'violationType' =>
                        $violation->violationType?->name ?? 'Unknown',
                    'category' =>
                        $violation->violationType?->category,
                    'incidentAt' =>
                        $violation->incident_at?->format('M d, Y h:i A'),
                    'location' => $violation->location,
                    'description' => $violation->description,
                    'reportedBy' =>
                        $violation->reportedBy?->name ?? 'Unknown',
                    'reportedByEmail' =>
                        $violation->reportedBy?->email,
                    'status' => $violation->status,
                ],

                'violationCount' => $violationCount,

                'reason' => $reason,

                'suggestion' => $suggestion,

                'violations' => $violations,

                'interventions' => $interventionData,
            ],
        ]);
    }
}