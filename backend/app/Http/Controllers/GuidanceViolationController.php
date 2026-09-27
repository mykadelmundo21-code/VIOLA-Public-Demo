<?php

namespace App\Http\Controllers;

use App\Events\UserNotification;
use App\Models\Violation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class GuidanceViolationController extends Controller
{
    public function index(
        Request $request
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

        $violations =
            Violation::with([
                'student',
                'violationType',
                'reportedBy',
            ])
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

                            'studentDbId' =>
                                $student?->id,

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

                            'reportedBy' =>
                                $violation
                                    ->reportedBy
                                    ?->name ??
                                'Unknown',

                            'reportedByEmail' =>
                                $violation
                                    ->reportedBy
                                    ?->email,

                            'status' =>
                                $violation->status,
                        ];
                    }
                )
                ->values();

        return response()->json([
            'data' => $violations,
        ]);
    }

    public function update(
        Request $request,
        Violation $violation
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

        $validated =
            $request->validate([
                'status' => [
                    'required',
                    'string',
                    Rule::in([
                        'reported',
                        'under_review',
                        'resolved',
                        'closed',
                    ]),
                ],
            ]);

        $oldStatus =
            $violation->status;

        $newStatus =
            $validated['status'];

        $violation->status =
            $newStatus;

        $violation->save();

        $violation->load([
            'student',
            'violationType',
            'reportedBy',
        ]);

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

        $violationName =
            $violation
                ->violationType
                ?->name ??
            'Violation';

        if (
            $oldStatus !==
            $newStatus
        ) {
            $statusLabel =
                match ($newStatus) {
                    'reported' =>
                        'For Review',

                    'under_review' =>
                        'Under Review',

                    'resolved' =>
                        'Resolved',

                    'closed' =>
                        'Closed',

                    default =>
                        ucfirst(
                            str_replace(
                                '_',
                                ' ',
                                $newStatus
                            )
                        ),
                };

            $title =
                match ($newStatus) {
                    'reported' =>
                        'Violation report updated',

                    'under_review' =>
                        'Violation report under review',

                    'resolved' =>
                        'Violation report resolved',

                    'closed' =>
                        'Violation report closed',

                    default =>
                        'Violation report updated',
                };

            $message =
                match ($newStatus) {
                    'reported' =>
                        "{$studentName}'s {$violationName} report is currently for review.",

                    'under_review' =>
                        "{$studentName}'s {$violationName} report is now under review by the Guidance Office.",

                    'resolved' =>
                        "{$studentName}'s {$violationName} case has been resolved by the Guidance Office.",

                    'closed' =>
                        "{$studentName}'s {$violationName} case has been closed by the Guidance Office.",

                    default =>
                        "{$studentName}'s {$violationName} report has been updated by the Guidance Office.",
                };

            $incidentDate =
                $violation->incident_at
                    ?->format('M d, Y h:i A') ??
                'Not specified';

            $location =
                $violation->location ??
                'Not specified';

            $description =
                $violation->description;

            $teacher =
                $violation->reportedBy;

            /*
             * ============================
             * TEACHER
             * Website + Email
             * ============================
             */

            if ($teacher) {
                UserNotification::dispatch(
                    userId:
                        (int) $teacher->id,

                    title:
                        $title,

                    message:
                        $message,

                    type:
                        'violation',

                    violationId:
                        (int) $violation->id,

                    status:
                        $newStatus,
                );

                if ($teacher->email) {
                    try {
                        Mail::send([], [], function ($mail) use (
                            $teacher,
                            $studentName,
                            $student,
                            $violationName,
                            $statusLabel,
                            $incidentDate,
                            $location,
                            $description,
                            $message
                        ) {
                            $mail
                                ->to($teacher->email)
                                ->subject(
                                    "VIOLA - Violation Report {$statusLabel}"
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
                                                VIOLATION REPORT UPDATE
                                            </p>

                                            <h2 style="color:#111827;">
                                                ' . e($statusLabel) . '
                                            </h2>

                                            <p style="color:#6b7280;line-height:1.6;">
                                                The violation report you submitted for
                                                <strong style="color:#111827;">
                                                    ' . e($studentName) . '
                                                </strong>
                                                has been updated by the Guidance Office.
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
                                                    ' . e($statusLabel) . '
                                                </p>
                                            </div>

                                            <p style="color:#6b7280;line-height:1.6;">
                                                ' . e($message) . '
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
                            'VIOLA teacher violation status email failed.',
                            [
                                'violation_id' =>
                                    $violation->id,

                                'teacher_id' =>
                                    $teacher->id,

                                'email' =>
                                    $teacher->email,

                                'error' =>
                                    $e->getMessage(),
                            ]
                        );
                    }
                }
            }

            /*
             * ============================
             * PARENT
             * Exact Student Relationship
             * Website + Email
             * ============================
             */

            if ($student) {
                $parents =
                    $student
                        ->parents()
                        ->where(
                            'role',
                            'parent'
                        )
                        ->get();

                foreach (
                    $parents
                    as $parent
                ) {
                    $parentName =
                        $parent->name ??
                        'Parent/Guardian';

                    UserNotification::dispatch(
                        userId:
                            (int) $parent->id,

                        title:
                            $title,

                        message:
                            $message,

                        type:
                            'violation',

                        violationId:
                            (int) $violation->id,

                        status:
                            $newStatus,
                    );

                    if ($parent->email) {
                        try {
                            Mail::send([], [], function ($mail) use (
                                $parent,
                                $parentName,
                                $studentName,
                                $student,
                                $violationName,
                                $statusLabel,
                                $incidentDate,
                                $location,
                                $description,
                                $message
                            ) {
                                $mail
                                    ->to($parent->email)
                                    ->subject(
                                        "VIOLA - Violation Report {$statusLabel}"
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
                                                    VIOLATION REPORT UPDATE
                                                </p>

                                                <h2 style="color:#111827;">
                                                    ' . e($statusLabel) . '
                                                </h2>

                                                <p style="color:#6b7280;line-height:1.6;">
                                                    Dear
                                                    <strong style="color:#111827;">
                                                        ' . e($parentName) . '
                                                    </strong>,
                                                </p>

                                                <p style="color:#6b7280;line-height:1.6;">
                                                    The violation report involving your child,
                                                    <strong style="color:#111827;">
                                                        ' . e($studentName) . '
                                                    </strong>,
                                                    has been updated by the Guidance Office.
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
                                                        ' . e($statusLabel) . '
                                                    </p>
                                                </div>

                                                <p style="color:#6b7280;line-height:1.6;">
                                                    ' . e($message) . '
                                                </p>

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
                                'VIOLA parent violation status email failed.',
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
            }
        }

        return response()->json([
            'success' => true,

            'message' =>
                'Violation status updated successfully.',

            'data' => [
                'id' =>
                    $violation->id,

                'studentDbId' =>
                    $student?->id,

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

                'reportedBy' =>
                    $violation
                        ->reportedBy
                        ?->name ??
                    'Unknown',

                'reportedByEmail' =>
                    $violation
                        ->reportedBy
                        ?->email,

                'status' =>
                    $violation->status,
            ],
        ]);
    }
}