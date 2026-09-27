<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' => 'Only teacher accounts can access this resource.',
            ], 403);
        }

        // Students assigned to this teacher
        $totalStudents = Student::where(
            'teacher_id',
            $teacher->id
        )->count();

        // Violations reported by this teacher
        $teacherViolations = Violation::with([
            'student',
            'violationType',
        ])
            ->where('reported_by', $teacher->id);

        $totalViolations = (clone $teacherViolations)->count();

        $pendingReports = (clone $teacherViolations)
            ->whereIn('status', [
                'reported',
                'under_review',
            ])
            ->count();

        $resolvedReports = (clone $teacherViolations)
            ->whereIn('status', [
                'resolved',
                'closed',
            ])
            ->count();

        // Recent violations reported by this teacher
        $recentViolations = (clone $teacherViolations)
            ->orderByDesc('incident_at')
            ->orderByDesc('id')
            ->take(5)
            ->get()
            ->map(function ($violation) {
                $student = $violation->student;

                return [
                    'id' => $violation->id,

                    'studentName' => $student
                        ? trim(
                            $student->first_name . ' ' .
                            ($student->middle_name
                                ? $student->middle_name . ' '
                                : '') .
                            $student->last_name
                        )
                        : 'Unknown Student',

                    'studentId' => $student?->student_id
                        ?? 'N/A',

                    'violation' => $violation->violationType?->name
                        ?? 'Violation',

                    'date' => $violation->incident_at
                        ? $violation->incident_at->format('M d, Y')
                        : 'No date',

                    'status' => match ($violation->status) {
                        'reported' => 'Reported',
                        'under_review' => 'Under Review',
                        'resolved' => 'Resolved',
                        'closed' => 'Resolved',
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
            'statistics' => [
                'total_students' => $totalStudents,
                'total_violations' => $totalViolations,
                'pending_reports' => $pendingReports,
                'resolved_reports' => $resolvedReports,
            ],

            'recent_violations' => $recentViolations,
        ]);
    }
}