<?php

namespace App\Http\Controllers;

use App\Models\Intervention;
use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GuidanceArchiveController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.'
            ], 403);
        }

        $schoolYears = Student::query()
            ->whereNotNull('school_year')
            ->where('school_year', '!=', '')
            ->distinct()
            ->orderByDesc('school_year')
            ->pluck('school_year')
            ->values();

        $selectedSchoolYear = $request->query('school_year');

        if (!$selectedSchoolYear) {
            $selectedSchoolYear = $schoolYears->first();
        }

        if (!$selectedSchoolYear) {
            return response()->json([
                'data' => [],
                'schoolYears' => [],
                'selectedSchoolYear' => null,
            ]);
        }

        [$startDate, $endDate] = $this->schoolYearDates(
            $selectedSchoolYear
        );

        $students = Student::query()
            ->where('school_year', $selectedSchoolYear)
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
            ]);

        $data = $students->map(function (Student $student) use (
            $startDate,
            $endDate
        ) {
            $violationCount = Violation::query()
                ->where('student_id', $student->id)
                ->whereBetween('incident_at', [
                    $startDate,
                    $endDate,
                ])
                ->count();

            $interventionCount = Intervention::query()
                ->where('student_id', $student->id)
                ->whereBetween('created_at', [
                    $startDate,
                    $endDate,
                ])
                ->count();

            $studentName = trim(
                $student->first_name . ' ' .
                ($student->middle_name
                    ? $student->middle_name . ' '
                    : '') .
                $student->last_name
            );

            return [
                'id' => $student->id,
                'studentId' => $student->student_id,
                'studentName' => $studentName,
                'gradeLevel' => $student->grade_level,
                'section' => $student->section,
                'schoolYear' => $student->school_year,
                'status' => $student->status,
                'violationCount' => $violationCount,
                'interventionCount' => $interventionCount,
            ];
        });

        return response()->json([
            'data' => $data->values(),
            'schoolYears' => $schoolYears,
            'selectedSchoolYear' => $selectedSchoolYear,
        ]);
    }

    public function show(
        Request $request,
        Student $student
    ): JsonResponse {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.'
            ], 403);
        }

        $schoolYear = $request->query('school_year');

        if (!$schoolYear) {
            $schoolYear = $student->school_year;
        }

        if ($student->school_year !== $schoolYear) {
            return response()->json([
                'message' =>
                    'The student does not belong to the selected school year.'
            ], 404);
        }

        [$startDate, $endDate] = $this->schoolYearDates(
            $schoolYear
        );

        $student->load([
            'teacher',
            'parents',
        ]);

        $violations = Violation::query()
            ->with([
                'violationType',
                'reportedBy',
            ])
            ->where('student_id', $student->id)
            ->whereBetween('incident_at', [
                $startDate,
                $endDate,
            ])
            ->orderByDesc('incident_at')
            ->orderByDesc('id')
            ->get();

        $interventions = Intervention::query()
            ->with([
                'violation.violationType',
                'recordedBy',
            ])
            ->where('student_id', $student->id)
            ->whereBetween('created_at', [
                $startDate,
                $endDate,
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $studentName = trim(
            $student->first_name . ' ' .
            ($student->middle_name
                ? $student->middle_name . ' '
                : '') .
            $student->last_name
        );

        $violationData = $violations
            ->map(function ($violation) {
                return [
                    'id' => $violation->id,
                    'violationType' =>
                        $violation->violationType?->name
                        ?? 'Unknown Violation',
                    'category' =>
                        $violation->violationType?->category,
                    'incidentAt' =>
                        $violation->incident_at
                            ?->format('M d, Y h:i A'),
                    'location' =>
                        $violation->location,
                    'description' =>
                        $violation->description,
                    'reportedBy' =>
                        $violation->reportedBy?->name
                        ?? 'Unknown',
                    'status' =>
                        $violation->status,
                ];
            })
            ->values();

        $interventionData = $interventions
            ->map(function ($intervention) {
                return [
                    'id' =>
                        $intervention->id,

                    'violationId' =>
                        $intervention->violation_id,

                    'violationType' =>
                        $intervention->violation
                            ?->violationType?->name
                        ?? 'Unknown Violation',

                    'interventionType' =>
                        $intervention->intervention_type,

                    'reason' =>
                        $intervention->reason,

                    'startDate' =>
                        $intervention->start_date
                            ?->format('M d, Y'),

                    'followUpDate' =>
                        $intervention->follow_up_date
                            ?->format('M d, Y'),

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
                        $intervention->recordedBy?->name
                        ?? 'Guidance',

                    'notes' =>
                        $intervention->notes,

                    'createdAt' =>
                        $intervention->created_at
                            ?->format('M d, Y h:i A'),
                ];
            })
            ->values();

        $parents = $student->parents
            ->where('role', 'parent')
            ->values()
            ->map(function ($parent) {
                return [
                    'id' =>
                        $parent->id,

                    'name' =>
                        $parent->name,

                    'email' =>
                        $parent->email,

                    'phone' =>
                        $parent->phone,
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'student' => [
                    'id' =>
                        $student->id,

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
                ],

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

                'schoolYear' =>
                    $schoolYear,

                'violations' =>
                    $violationData,

                'interventions' =>
                    $interventionData,

                'violationCount' =>
                    $violationData->count(),

                'interventionCount' =>
                    $interventionData->count(),
            ],
        ]);
    }

    private function schoolYearDates(
        string $schoolYear
    ): array {
        if (!preg_match(
            '/^(\d{4})-(\d{4})$/',
            $schoolYear,
            $matches
        )) {
            abort(422, 'Invalid school year format.');
        }

        $startYear = (int) $matches[1];
        $endYear = (int) $matches[2];

        if ($endYear !== $startYear + 1) {
            abort(422, 'Invalid school year range.');
        }

        $startDate = Carbon::create(
            $startYear,
            6,
            1,
            0,
            0,
            0
        );

        $endDate = Carbon::create(
            $endYear,
            5,
            31,
            23,
            59,
            59
        );

        return [
            $startDate,
            $endDate,
        ];
    }
}