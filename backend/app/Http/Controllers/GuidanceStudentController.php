<?php

namespace App\Http\Controllers;

use App\Models\Intervention;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuidanceStudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $students = Student::query()
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get([
                'id',
                'student_id',
                'first_name',
                'middle_name',
                'last_name',
                'grade_level',
                'section',
                'school_year',
                'status',
            ])
            ->map(function (Student $student) {
                return [
                    'id' => $student->id,

                    'studentId' => $student->student_id,

                    'name' => trim(
                        $student->first_name . ' ' .
                        ($student->middle_name
                            ? $student->middle_name . ' '
                            : '') .
                        $student->last_name
                    ),

                    'gradeLevel' => $student->grade_level,
                    'section' => $student->section,
                    'schoolYear' => $student->school_year,
                    'status' => $student->status,
                ];
            });

        return response()->json([
            'data' => $students,
        ]);
    }

    public function show(
        Request $request,
        Student $student
    ): JsonResponse {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $student->load([
            'teacher',
            'parents',
            'violations.violationType',
            'violations.reportedBy',
        ]);

        $interventions = Intervention::query()
            ->with([
                'violation.violationType',
                'recordedBy',
            ])
            ->where('student_id', $student->id)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();

        $studentName = trim(
            $student->first_name . ' ' .
            ($student->middle_name
                ? $student->middle_name . ' '
                : '') .
            $student->last_name
        );

        $violations = $student->violations
            ->sortByDesc('incident_at')
            ->values()
            ->map(function ($violation) {
                return [
                    'id' => $violation->id,

                    'violationType' =>
                        $violation->violationType?->name
                        ?? 'Unknown Violation',

                    'category' =>
                        $violation->violationType?->category,

                    'incidentAt' =>
                        $violation->incident_at?->format(
                            'M d, Y h:i A'
                        ),

                    'location' =>
                        $violation->location,

                    'description' =>
                        $violation->description,

                    'reportedBy' =>
                        $violation->reportedBy?->name
                        ?? 'Unknown',

                    'reportedByEmail' =>
                        $violation->reportedBy?->email,

                    'status' =>
                        $violation->status,
                ];
            })
            ->values();

        $interventionData = $interventions
            ->map(function ($intervention) {
                return [
                    'id' => $intervention->id,

                    'violationId' =>
                        $intervention->violation_id,

                    'violationType' =>
                        $intervention
                            ->violation
                            ?->violationType
                            ?->name
                            ?? 'Unknown Violation',

                    'interventionType' =>
                        $intervention->intervention_type,

                    'reason' =>
                        $intervention->reason,

                    'startDate' =>
                        $intervention->start_date?->format(
                            'M d, Y'
                        ),

                    'followUpDate' =>
                        $intervention->follow_up_date?->format(
                            'M d, Y'
                        ),

                    'status' =>
                        $intervention->status,

                    'parentContactRequired' =>
                        (bool) $intervention
                            ->parent_contact_required,

                    'parentContactMethod' =>
                        $intervention
                            ->parent_contact_method,

                    'parentContactStatus' =>
                        $intervention
                            ->parent_contact_status,

                    'assignedTo' =>
                        $intervention
                            ->recordedBy
                            ?->name
                            ?? 'Guidance',

                    'notes' =>
                        $intervention->notes,

                    'createdAt' =>
                        $intervention->created_at?->format(
                            'M d, Y h:i A'
                        ),

                    'updatedAt' =>
                        $intervention->updated_at?->format(
                            'M d, Y h:i A'
                        ),
                ];
            })
            ->values();

        $parents = $student->parents
            ->where('role', 'parent')
            ->values()
            ->map(function ($parent) {
                return [
                    'id' => $parent->id,
                    'name' => $parent->name,
                    'email' => $parent->email,
                    'phone' => $parent->phone,
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'id' => $student->id,

                'studentId' =>
                    $student->student_id,

                'name' =>
                    $studentName,

                'firstName' =>
                    $student->first_name,

                'middleName' =>
                    $student->middle_name,

                'lastName' =>
                    $student->last_name,

                'gradeLevel' =>
                    $student->grade_level,

                'section' =>
                    $student->section,

                'schoolYear' =>
                    $student->school_year,

                'status' =>
                    $student->status,

                'teacher' => $student->teacher
                    ? [
                        'id' =>
                            $student->teacher->id,

                        'name' =>
                            $student->teacher->name,

                        'email' =>
                            $student->teacher->email,

                        'phone' =>
                            $student->teacher->phone,
                    ]
                    : null,

                'parents' =>
                    $parents,

                'violations' =>
                    $violations,

                'interventions' =>
                    $interventionData,

                'violationCount' =>
                    $violations->count(),

                'interventionCount' =>
                    $interventionData->count(),
            ],
        ]);
    }
}