<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class GuidanceDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        /*
         * TOTAL ACTIVE STUDENTS
         */
        $totalStudents = DB::table('students')
            ->where('status', 'active')
            ->count();

        /*
         * ACTIVE VIOLATIONS
         *
         * Includes:
         * - reported
         * - under_review
         */
        $activeViolations = DB::table('violations')
            ->whereIn('status', [
                'reported',
                'under_review',
            ])
            ->count();

        /*
         * PENDING REVIEWS
         *
         * A newly reported violation is still
         * waiting for Guidance review.
         */
        $pendingReviews = DB::table('violations')
            ->whereIn('status', [
                'reported',
                'under_review',
            ])
            ->count();

        /*
         * RESOLVED VIOLATIONS
         */
        $resolvedViolations = DB::table('violations')
            ->whereIn('status', [
                'resolved',
                'closed',
            ])
            ->count();

        /*
         * VIOLATION DISTRIBUTION
         */
        $distribution = DB::table('violations')
            ->join(
                'violation_types',
                'violations.violation_type_id',
                '=',
                'violation_types.id'
            )
            ->select(
                'violation_types.category',
                DB::raw('COUNT(violations.id) as count')
            )
            ->groupBy('violation_types.category')
            ->orderByDesc('count')
            ->get();

        /*
         * MONTHLY VIOLATION ACTIVITY
         *
         * SQLite and MySQL use different SQL functions for month/year extraction,
         * so we keep the query database-aware to avoid a 500 during dashboard loads.
         */
        if (config('database.default') === 'sqlite') {
            $monthlyActivity = DB::table('violations')
                ->select(
                    DB::raw("CAST(strftime('%m', incident_at) AS INTEGER) as month"),
                    DB::raw('COUNT(id) as count')
                )
                ->whereRaw("strftime('%Y', incident_at) = ?", [now()->year])
                ->groupBy(DB::raw("strftime('%m', incident_at)"))
                ->orderBy('month')
                ->get()
                ->map(function ($item) {
                    return [
                        'month' => (int) $item->month,
                        'count' => (int) $item->count,
                    ];
                });
        } else {
            $monthlyActivity = DB::table('violations')
                ->select(
                    DB::raw('MONTH(incident_at) as month'),
                    DB::raw('COUNT(id) as count')
                )
                ->whereYear('incident_at', now()->year)
                ->groupBy(DB::raw('MONTH(incident_at)'))
                ->orderBy('month')
                ->get()
                ->map(function ($item) {
                    return [
                        'month' => (int) $item->month,
                        'count' => (int) $item->count,
                    ];
                });
        }

        /*
         * RECENT VIOLATION REPORTS
         */
        $recentViolations = DB::table('violations')
            ->join(
                'students',
                'violations.student_id',
                '=',
                'students.id'
            )
            ->join(
                'violation_types',
                'violations.violation_type_id',
                '=',
                'violation_types.id'
            )
            ->join(
                'users',
                'violations.reported_by',
                '=',
                'users.id'
            )
            ->select(
                'violations.id',
                'violations.incident_at',
                'violations.status',
                'violations.description',
                'students.student_id',
                'students.first_name',
                'students.middle_name',
                'students.last_name',
                'violation_types.category',
                'violation_types.name as violation_name',
                'users.name as reported_by'
            )
            ->orderByDesc('violations.incident_at')
            ->orderByDesc('violations.id')
            ->limit(5)
            ->get()
            ->map(function ($violation) {

                $fullName = trim(
                    $violation->first_name . ' ' .
                    ($violation->middle_name
                        ? $violation->middle_name . ' '
                        : '') .
                    $violation->last_name
                );

                return [
                    'id' => $violation->id,
                    'student_id' => $violation->student_id,
                    'student' => $fullName,
                    'type' => $violation->violation_name,
                    'category' => $violation->category,
                    'date' => $violation->incident_at,
                    'status' => $violation->status,
                    'description' => $violation->description,
                    'reported_by' => $violation->reported_by,
                ];
            });

        /*
         * RESPONSE
         *
         * Matches GuidanceDashboard.tsx
         */
        return response()->json([
            'success' => true,

            'data' => [
                'total_students' => $totalStudents,

                'active_violations' => $activeViolations,

                'pending_reviews' => $pendingReviews,

                'pending_assessments' => 0,

                'active_interventions' => 0,

                'resolved_violations' => $resolvedViolations,

                'followups' => 0,

                'violation_distribution' => $distribution,

                'monthly_activity' => $monthlyActivity,

                'recent_violations' => $recentViolations,
            ],
        ]);
    }
}