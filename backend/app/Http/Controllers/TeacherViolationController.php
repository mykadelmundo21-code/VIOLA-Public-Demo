<?php

namespace App\Http\Controllers;

use App\Events\UserNotification;
use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TeacherViolationController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $teacher = $request->user();

        if (!$teacher) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' =>
                    'Only teacher accounts can access violation history.',
            ], 403);
        }

        $violations = Violation::query()
            ->with([
                'student',
                'violationType',
                'reportedBy',
            ])
            ->where(
                'reported_by',
                $teacher->id
            )
            ->orderByDesc(
                'incident_at'
            )
            ->orderByDesc('id')
            ->get()
            ->map(
                function (
                    Violation $violation
                ) {
                    $student =
                        $violation->student;

                    $studentName =
                        $student
                            ? trim(
                                $student->first_name .
                                    ' ' .
                                    (
                                        $student->middle_name
                                            ? $student->middle_name .
                                                ' '
                                            : ''
                                    ) .
                                    $student->last_name
                            )
                            : 'Unknown Student';

                    return [
                        'id' =>
                            $violation->id,

                        'studentId' =>
                            $student?->student_id,

                        'studentName' =>
                            $studentName,

                        'gradeLevel' =>
                            $student?->grade_level,

                        'section' =>
                            $student?->section,

                        'violationType' =>
                            $violation
                                ->violationType
                                ?->name ??
                            'Unknown Violation',

                        'category' =>
                            $violation
                                ->violationType
                                ?->category,

                        'date' =>
                            $violation
                                ->incident_at
                                ?->format(
                                    'M d, Y'
                                ),

                        'incidentAt' =>
                            $violation
                                ->incident_at
                                ?->format(
                                    'Y-m-d H:i:s'
                                ),

                        'location' =>
                            $violation->location,

                        'description' =>
                            $violation->description,

                        'status' =>
                            $violation->status,

                        'createdAt' =>
                            $violation
                                ->created_at
                                ?->toISOString(),

                        'updatedAt' =>
                            $violation
                                ->updated_at
                                ?->toISOString(),
                    ];
                }
            )
            ->values();

        return response()->json([
            'data' => $violations,
        ]);
    }

    public function students(
        Request $request
    ): JsonResponse {
        $teacher = $request->user();

        if (!$teacher) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' =>
                    'Only teacher accounts can access students.',
            ], 403);
        }

        $students = Student::query()
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(
                function (
                    Student $student
                ) {
                    return [
                        'id' =>
                            $student->id,

                        'student_id' =>
                            $student->student_id,

                        'name' =>
                            trim(
                                $student->first_name .
                                    ' ' .
                                    (
                                        $student->middle_name
                                            ? $student->middle_name .
                                                ' '
                                            : ''
                                    ) .
                                    $student->last_name
                            ),

                        'grade_level' =>
                            $student->grade_level,

                        'section' =>
                            $student->section,
                    ];
                }
            )
            ->values();

        return response()->json([
            'data' => $students,
        ]);
    }

    public function types(
        Request $request
    ): JsonResponse {
        $teacher = $request->user();

        if (!$teacher) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' =>
                    'Only teacher accounts can access violation types.',
            ], 403);
        }

        $types = ViolationType::where(
            'is_active',
            true
        )
            ->orderBy('category')
            ->orderBy('name')
            ->get([
                'id',
                'category',
                'name',
            ]);

        return response()->json([
            'data' => $types,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $teacher = $request->user();

        if (!$teacher) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' =>
                    'Only teacher accounts can report violations.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => [
                'required',
                'integer',
                'exists:students,id',
            ],

            'violation_type_id' => [
                'required',
                'integer',
                'exists:violation_types,id',
            ],

            'incident_at' => [
                'required',
                'date',
            ],

            'description' => [
                'required',
                'string',
            ],
        ]);

        $student =
            Student::find(
                $validated['student_id']
            );

        if (!$student) {
            return response()->json([
                'message' =>
                    'Student not found.',
            ], 404);
        }

        $violationType =
            ViolationType::where(
                'id',
                $validated[
                    'violation_type_id'
                ]
            )
                ->where(
                    'is_active',
                    true
                )
                ->first();

        if (!$violationType) {
            return response()->json([
                'message' =>
                    'The selected violation type does not exist or is inactive.',
            ], 422);
        }

        $violation =
            Violation::create([
                'student_id' =>
                    $student->id,

                'violation_type_id' =>
                    $violationType->id,

                'reported_by' =>
                    $teacher->id,

                'incident_at' =>
                    $validated[
                        'incident_at'
                    ],

                'description' =>
                    $validated[
                        'description'
                    ],

                'status' =>
                    'reported',
            ]);

        $violation->load([
            'student',
            'violationType',
            'reportedBy',
        ]);

        $studentName =
            trim(
                $student->first_name .
                    ' ' .
                    (
                        $student->middle_name
                            ? $student->middle_name .
                                ' '
                            : ''
                    ) .
                    $student->last_name
            );

        $violationName =
            $violationType->name;

        $incidentDate =
            $violation->incident_at
                ?->format('M d, Y h:i A') ??
            'Not specified';

        $location =
            $violation->location ??
            'Not specified';

        $description =
            $violation->description;

        $teacherName =
            $teacher->name ??
            'Teacher';

        /*
         * ============================
         * GUIDANCE
         * Website + Email
         * ============================
         */

        $guidanceUsers =
            User::where(
                'role',
                'guidance'
            )->get();

        foreach (
            $guidanceUsers
            as $guidance
        ) {
            UserNotification::dispatch(
                userId:
                    (int) $guidance->id,

                title:
                    'New violation report',

                message:
                    "{$studentName} has a new {$violationName} violation report.",

                type:
                    'violation',

                violationId:
                    (int) $violation->id,

                status:
                    'reported',
            );

            if ($guidance->email) {
                try {
                    Mail::send([], [], function ($mail) use (
                        $guidance,
                        $studentName,
                        $student,
                        $violationName,
                        $incidentDate,
                        $location,
                        $description,
                        $teacherName
                    ) {
                        $mail
                            ->to($guidance->email)
                            ->subject(
                                'VIOLA - New Violation Report'
                            )
                            ->html(
                                '
                                <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f3f4f6;color:#111827;">
                                    <div style="background:#1f2937;padding:25px;text-align:center;border-radius:12px 12px 0 0;">
                                        <div style="display:inline-block;background:#ffffff;color:#b91c1c;font-size:32px;font-weight:bold;padding:12px 18px;border-radius:10px;">V</div>
                                        <h1 style="color:#ffffff;margin:15px 0 0;">VIOLA</h1>
                                    </div>

                                    <div style="background:#ffffff;padding:30px;border:1px solid #e5e7eb;">
                                        <p style="color:#b91c1c;font-size:13px;font-weight:bold;">
                                            NEW VIOLATION REPORT
                                        </p>

                                        <h2 style="color:#111827;">
                                            A violation has been reported
                                        </h2>

                                        <p style="color:#6b7280;line-height:1.6;">
                                            A new violation report involving
                                            <strong style="color:#111827;">
                                                ' . e($studentName) . '
                                            </strong>
                                            has been submitted by
                                            <strong style="color:#111827;">
                                                ' . e($teacherName) . '
                                            .
                                        </p>

                                        <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:20px;margin:25px 0;border-radius:10px;">
                                            <p style="color:#6b7280;margin:0 0 6px;">Student</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($studentName) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Student ID</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($student->student_id ?? 'Not specified') . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Grade & Section</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e(($student->grade_level ?? 'Not specified') . ' - ' . ($student->section ?? 'Not specified')) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Violation</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($violationName) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Date & Time</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($incidentDate) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Location</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($location) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Description</p>
                                            <p style="color:#111827;margin:0 0 16px;line-height:1.6;">
                                                ' . e($description) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Current Status</p>
                                            <p style="color:#b91c1c;font-weight:bold;margin:0;">
                                                For Review
                                            </p>
                                        </div>

                                        <p style="color:#6b7280;line-height:1.6;">
                                            Please log in to the VIOLA portal to review this violation report.
                                        </p>

                                        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">
                                            VIOLA • An Intelligent Student Violation Monitoring
                                        </p>
                                    </div>
                                </div>
                                '
                            );
                    });
                } catch (\Throwable $e) {
                    Log::error(
                        'VIOLA guidance violation report email failed.',
                        [
                            'violation_id' =>
                                $violation->id,

                            'guidance_id' =>
                                $guidance->id,

                            'email' =>
                                $guidance->email,

                            'error' =>
                                $e->getMessage(),
                        ]
                    );
                }
            }
        }

        /*
         * ============================
         * PARENTS
         * Exact Student Relationship
         * Website + Email
         * ============================
         */

        $parentIds =
            DB::table(
                'parent_students'
            )
                ->where(
                    'student_id',
                    $student->id
                )
                ->pluck(
                    'parent_id'
                );

        $parentUsers =
            User::whereIn(
                'id',
                $parentIds
            )
                ->where(
                    'role',
                    'parent'
                )
                ->get();

        foreach (
            $parentUsers
            as $parent
        ) {
            $parentName =
                $parent->name ??
                'Parent/Guardian';

            UserNotification::dispatch(
                userId:
                    (int) $parent->id,

                title:
                    'New violation report',

                message:
                    "A {$violationName} violation involving {$studentName} has been reported and is currently for review by the Guidance Office.",

                type:
                    'violation',

                violationId:
                    (int) $violation->id,

                status:
                    'reported',
            );

            if ($parent->email) {
                try {
                    Mail::send([], [], function ($mail) use (
                        $parent,
                        $parentName,
                        $studentName,
                        $student,
                        $violationName,
                        $incidentDate,
                        $location,
                        $description,
                        $teacherName
                    ) {
                        $mail
                            ->to($parent->email)
                            ->subject(
                                'VIOLA - New Violation Report'
                            )
                            ->html(
                                '
                                <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:30px;background:#f3f4f6;color:#111827;">
                                    <div style="background:#1f2937;padding:25px;text-align:center;border-radius:12px 12px 0 0;">
                                        <div style="display:inline-block;background:#ffffff;color:#b91c1c;font-size:32px;font-weight:bold;padding:12px 18px;border-radius:10px;">V</div>
                                        <h1 style="color:#ffffff;margin:15px 0 0;">VIOLA</h1>
                                    </div>

                                    <div style="background:#ffffff;padding:30px;border:1px solid #e5e7eb;">
                                        <p style="color:#b91c1c;font-size:13px;font-weight:bold;">
                                            NEW VIOLATION REPORT
                                        </p>

                                        <h2 style="color:#111827;">
                                            Dear ' . e($parentName) . ',
                                        </h2>

                                        <p style="color:#6b7280;line-height:1.6;">
                                            A violation involving your child has been reported and is currently
                                            <strong style="color:#b91c1c;">For Review</strong>
                                            by the Guidance Office.
                                        </p>

                                        <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:20px;margin:25px 0;border-radius:10px;">
                                            <p style="color:#6b7280;margin:0 0 6px;">Student</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($studentName) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Student ID</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($student->student_id ?? 'Not specified') . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Grade & Section</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e(($student->grade_level ?? 'Not specified') . ' - ' . ($student->section ?? 'Not specified')) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Violation</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($violationName) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Date & Time</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($incidentDate) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Location</p>
                                            <p style="color:#111827;font-weight:bold;margin:0 0 16px;">
                                                ' . e($location) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Description</p>
                                            <p style="color:#111827;margin:0 0 16px;line-height:1.6;">
                                                ' . e($description) . '
                                            </p>

                                            <p style="color:#6b7280;margin:0 0 6px;">Reported By</p>
                                            <p style="color:#111827;font-weight:bold;margin:0;">
                                                ' . e($teacherName) . '
                                            </p>
                                        </div>

                                        <p style="color:#6b7280;line-height:1.6;">
                                            Please log in to the VIOLA portal for more information.
                                        </p>

                                        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">
                                            VIOLA • An Intelligent Student Violation Monitoring
                                        </p>
                                    </div>
                                </div>
                                '
                            );
                    });
                } catch (\Throwable $e) {
                    Log::error(
                        'VIOLA parent violation report email failed.',
                        [
                            'violation_id' =>
                                $violation->id,

                            'parent_id' =>
                                $parent->id,

                            'email' =>
                                $parent->email,

                            'error' =>
                                $e->getMessage(),
                        ]
                    );
                }
            }
        }

        return response()->json([
            'message' =>
                'Violation report submitted successfully.',

            'data' => [
                'id' =>
                    $violation->id,

                'studentId' =>
                    $violation
                        ->student
                        ?->student_id,

                'studentName' =>
                    $violation->student
                        ? trim(
                            $violation->student->first_name .
                                ' ' .
                                (
                                    $violation->student->middle_name
                                        ? $violation->student->middle_name .
                                            ' '
                                        : ''
                                ) .
                                $violation->student->last_name
                        )
                        : 'Unknown Student',

                'violationType' =>
                    $violation
                        ->violationType
                        ?->name,

                'date' =>
                    $violation
                        ->incident_at
                        ?->format(
                            'M d, Y'
                        ),

                'description' =>
                    $violation->description,

                'reportedBy' =>
                    $violation
                        ->reportedBy
                        ?->name,

                'status' =>
                    $violation->status,
            ],
        ], 201);
    }
}