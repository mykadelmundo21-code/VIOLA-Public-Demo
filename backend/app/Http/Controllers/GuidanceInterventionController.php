<?php

namespace App\Http\Controllers;

use App\Events\UserNotification;
use App\Models\Intervention;
use App\Models\InterventionHistory;
use App\Models\Violation;
use App\Services\SemaphoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class GuidanceInterventionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $interventions = Intervention::with([
            'student',
            'violation.violationType',
            'recordedBy',
        ])
            ->latest()
            ->get()
            ->map(function ($intervention) {
                $student = $intervention->student;
                $violation = $intervention->violation;

                return [
                    'id' => $intervention->id,

                    'studentId' => $student?->student_id,

                    'studentName' => $student
                        ? trim(
                            $student->first_name . ' ' .
                            ($student->middle_name
                                ? $student->middle_name . ' '
                                : '') .
                            $student->last_name
                        )
                        : 'Unknown Student',

                    'gradeLevel' => $student?->grade_level,

                    'section' => $student?->section,

                    'violationType' =>
                        $violation?->violationType?->name
                        ?? 'Unknown',

                    'violationId' =>
                        $intervention->violation_id,

                    'interventionType' =>
                        $intervention->intervention_type,

                    'reason' =>
                        $intervention->reason,

                    'startDate' =>
                        $intervention->start_date?->format('Y-m-d'),

                    'followUpDate' =>
                        $intervention->follow_up_date?->format('Y-m-d'),

                    'assignedTo' =>
                        $intervention->recordedBy?->name
                        ?? 'Guidance',

                    'status' =>
                        $intervention->status,

                    'notes' =>
                        $intervention->notes,

                    'createdAt' =>
                        $intervention->created_at?->format(
                            'Y-m-d H:i:s'
                        ),

                    'updatedAt' =>
                        $intervention->updated_at?->format(
                            'Y-m-d H:i:s'
                        ),
                ];
            })
            ->values();

        return response()->json([
            'data' => $interventions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => [
                'required',
                'exists:students,id',
            ],

            'violation_id' => [
                'required',
                'exists:violations,id',
            ],

            'intervention_type' => [
                'required',
                'string',
                'max:100',
            ],

            'reason' => [
                'nullable',
                'string',
            ],

            'start_date' => [
                'required',
                'date',
            ],

            'follow_up_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'scheduled',
                    'active',
                    'completed',
                ]),
            ],

            'notes' => [
                'nullable',
                'string',
            ],
        ]);

        $violation = Violation::with([
            'reportedBy',
            'violationType',
        ])
            ->where('id', $validated['violation_id'])
            ->where('student_id', $validated['student_id'])
            ->first();

        if (!$violation) {
            return response()->json([
                'message' =>
                    'The selected violation does not belong to the selected student.',
            ], 422);
        }

        if ($violation->status !== 'under_review') {
            return response()->json([
                'message' =>
                    'An intervention can only be created while the violation is under review.',
            ], 422);
        }

        if (
            Intervention::where(
                'violation_id',
                $validated['violation_id']
            )->exists()
        ) {
            return response()->json([
                'message' =>
                    'An intervention already exists for this violation. Please update the existing intervention instead.',
            ], 409);
        }

        $validated['recorded_by'] = $user->id;

        $intervention = Intervention::create($validated);

        $teacher = $violation->reportedBy;
        $student = $intervention->student()->first();

        $studentName = $student
            ? trim(
                $student->first_name . ' ' .
                ($student->middle_name
                    ? $student->middle_name . ' '
                    : '') .
                $student->last_name
            )
            : 'Unknown Student';

        $violationName =
            $violation->violationType?->name
            ?? 'violation';

        if ($teacher) {
            UserNotification::dispatch(
                userId: (int) $teacher->id,
                title: 'Intervention recorded',
                message:
                    "An intervention has been recorded for {$studentName}'s {$violationName} case. The violation remains under review.",
                type: 'intervention',
                violationId: (int) $violation->id,
                status: $violation->status,
            );
        }

        if ($student) {
            foreach ($student->parents as $parent) {
                UserNotification::dispatch(
                    userId: (int) $parent->id,
                    title: 'Intervention recorded',
                    message:
                        "An intervention has been recorded for {$studentName}'s {$violationName} case. Please check the Parent Portal for the latest case information.",
                    type: 'intervention',
                    violationId: (int) $violation->id,
                    status: $violation->status,
                );
            }
        }

        return response()->json([
            'success' => true,

            'message' =>
                'Intervention recorded successfully.',

            'data' => $intervention->load([
                'student',
                'violation.violationType',
                'recordedBy',
            ]),
        ], 201);
    }

    public function update(
        Request $request,
        Intervention $intervention
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

        $validated = $request->validate([
            'intervention_type' => [
                'required',
                'string',
                'max:100',
            ],

            'reason' => [
                'nullable',
                'string',
            ],

            'start_date' => [
                'required',
                'date',
            ],

            'follow_up_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],

            'status' => [
                'required',
                Rule::in([
                    'scheduled',
                    'active',
                    'completed',
                ]),
            ],

            'notes' => [
                'nullable',
                'string',
            ],
        ]);

        $intervention->load([
            'student',
            'violation.reportedBy',
            'violation.violationType',
        ]);

        $trackedFields = [
            'intervention_type',
            'reason',
            'start_date',
            'follow_up_date',
            'status',
            'notes',
        ];

        $oldValues = [];
        $newValues = [];

        foreach ($trackedFields as $field) {
            $oldValue = $intervention->{$field};
            $newValue = $validated[$field] ?? null;

            if ($oldValue instanceof \Carbon\Carbon) {
                $oldValue = $oldValue->format('Y-m-d');
            }

            if ($newValue instanceof \Carbon\Carbon) {
                $newValue = $newValue->format('Y-m-d');
            }

            $oldValues[$field] = $oldValue;
            $newValues[$field] = $newValue;
        }

        $hasChanges = false;

        foreach ($trackedFields as $field) {
            $oldValue = $oldValues[$field];
            $newValue = $newValues[$field];

            if ((string) $oldValue !== (string) $newValue) {
                $hasChanges = true;
                break;
            }
        }

        if (!$hasChanges) {
            $intervention->load([
                'student',
                'violation.violationType',
                'recordedBy',
                'histories.modifiedBy',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'No changes were made.',
                'data' => $intervention,
            ]);
        }

        $previousStatus = $intervention->status;
        $newStatus = $validated['status'];

        DB::transaction(function () use (
            $intervention,
            $validated,
            $oldValues,
            $newValues,
            $user,
            $newStatus
        ) {
            $intervention->update($validated);

            InterventionHistory::create([
                'intervention_id' => $intervention->id,
                'modified_by' => $user->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
            ]);

            /*
             * Completing the intervention closes the entire case.
             */
            if ($newStatus === 'completed') {
                $violation = $intervention->violation;

                if (
                    $violation &&
                    $violation->status !== 'closed'
                ) {
                    $violation->update([
                        'status' => 'closed',
                    ]);
                }
            }
        });

        $intervention->refresh();

        $intervention->load([
            'student',
            'violation.reportedBy',
            'violation.violationType',
            'recordedBy',
            'histories.modifiedBy',
        ]);

        $violation = $intervention->violation;
        $teacher = $violation?->reportedBy;

        $student = $intervention->student;

        $studentName = $student
            ? trim(
                $student->first_name . ' ' .
                ($student->middle_name
                    ? $student->middle_name . ' '
                    : '') .
                $student->last_name
            )
            : 'Unknown Student';

        $violationName =
            $violation?->violationType?->name
            ?? 'violation';

        /*
         * Notify the reporting teacher when the intervention is updated.
         *
         * The Guidance user who made the change is never notified.
         * Email is sent only when the intervention is completed and
         * the entire case is closed.
         */
        if ($teacher) {
            $notificationTitle =
                $newStatus === 'completed'
                    ? 'Case closed'
                    : 'Intervention updated';

            $notificationMessage =
                $newStatus === 'completed'
                    ? "The {$violationName} case for {$studentName} has been completed and closed."
                    : "The intervention for {$studentName}'s {$violationName} case has been updated.";

            UserNotification::dispatch(
                userId: (int) $teacher->id,
                title: $notificationTitle,
                message: $notificationMessage,
                type: 'intervention',
                violationId: (int) $violation->id,
                status: $violation->status,
            );

            if ($newStatus === 'completed') {
                $this->sendCaseUpdateEmail(
                    $teacher->email,
                    $teacher->name,
                    $studentName,
                    $violationName,
                    $intervention->intervention_type,
                    $newStatus,
                    'closed'
                );
            }
        }

        /*
         * Parent website notification is sent for every intervention update.
         * Email is sent only when the intervention is completed and the
         * entire case is closed.
         */
        if ($student) {
            foreach ($student->parents as $parent) {
                if ($newStatus === 'completed') {
                    UserNotification::dispatch(
                        userId: (int) $parent->id,
                        title: 'Case closed',
                        message:
                            "The {$violationName} case for {$studentName} has been completed and closed.",
                        type: 'violation',
                        violationId: (int) $violation->id,
                        status: 'closed',
                    );

                    if (!empty($parent->email)) {
                        $this->sendCaseUpdateEmail(
                            $parent->email,
                            $parent->name,
                            $studentName,
                            $violationName,
                            $intervention->intervention_type,
                            $newStatus,
                            'closed'
                        );
                    }
                } else {
                    UserNotification::dispatch(
                        userId: (int) $parent->id,
                        title: 'Intervention updated',
                        message:
                            "The intervention for {$studentName}'s {$violationName} case has been updated. Please check the Parent Portal for the latest case information.",
                        type: 'intervention',
                        violationId: (int) $violation->id,
                        status: $violation->status,
                    );
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
                $newStatus === 'completed'
                    ? 'Intervention completed and case closed successfully.'
                    : 'Intervention updated successfully.',
            'data' => $intervention,
        ]);
    }

    public function history(
        Request $request,
        Intervention $intervention
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

        $histories = $intervention
            ->histories()
            ->with('modifiedBy')
            ->latest()
            ->get()
            ->map(function ($history) {
                return [
                    'id' => $history->id,

                    'oldValues' =>
                        $history->old_values,

                    'newValues' =>
                        $history->new_values,

                    'modifiedBy' =>
                        $history->modifiedBy?->name
                        ?? 'Unknown',

                    'modifiedAt' =>
                        $history->created_at?->format(
                            'Y-m-d H:i:s'
                        ),
                ];
            })
            ->values();

        return response()->json([
            'data' => $histories,
        ]);
    }

    public function notifyParent(
        Request $request,
        Intervention $intervention
    ): JsonResponse {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $intervention->load([
            'student.parents',
            'violation.violationType',
        ]);

        $parents = $intervention->student?->parents;

        if (!$parents || $parents->isEmpty()) {
            return response()->json([
                'message' =>
                    'No parent account is linked to this student.',
            ], 422);
        }

        $student = $intervention->student;

        $studentName = trim(
            $student->first_name . ' ' .
            ($student->middle_name
                ? $student->middle_name . ' '
                : '') .
            $student->last_name
        );

        $studentId = $student->student_id ?? 'N/A';
        $gradeLevel = $student->grade_level ?? 'N/A';
        $section = $student->section ?? 'N/A';

        $violationName =
            $intervention->violation?->violationType?->name
            ?? 'violation';

        $title = 'Guidance Update';

        $message =
            "A guidance update requires your attention regarding "
            . "{$studentName}'s {$violationName} case. "
            . "Please check the Parent Portal for the latest case information.";

        $emailSent = 0;
        $emailFailed = 0;
        $smsSent = 0;
        $smsFailed = 0;

        foreach ($parents as $parent) {
            /*
             * Website notification
             */
            UserNotification::dispatch(
                userId: (int) $parent->id,
                title: $title,
                message: $message,
                type: 'intervention',
                violationId: (int) $intervention->violation_id,
                status: $intervention->violation?->status,
            );

            /*
             * Email notification
             */
            if (!empty($parent->email)) {
                try {
                    $emailSubject =
                        'VIOLA - Guidance Update';

                    Mail::send(
                        'emails.intervention-updated',
                        [
                            'recipientName' => $parent->name,
                            'studentName' => $studentName,
                            'violationName' => $violationName,
                            'interventionType' => $intervention->intervention_type,
                            'interventionStatusLabel' => ucfirst(
                                str_replace('_', ' ', $intervention->status)
                            ),
                            'caseStatusLabel' => ucfirst(
                                str_replace(
                                    '_',
                                    ' ',
                                    $intervention->violation?->status ?? 'under_review'
                                )
                            ),
                            'emailTitle' => 'Guidance Update',
                            'bodyMessage' =>
                                'The Guidance Office has an important update regarding your child. Please review the latest case information through the VIOLA Parent Portal.',
                        ],
                        function ($mail) use (
                            $parent,
                            $emailSubject
                        ) {
                            $mail
                                ->to($parent->email)
                                ->subject($emailSubject);
                        }
                    );

                    $emailSent++;
                } catch (\Throwable $e) {
                    $emailFailed++;

                    Log::error(
                        'VIOLA Notify Parent email failed.',
                        [
                            'parent_id' => $parent->id,
                            'parent_email' => $parent->email,
                            'intervention_id' => $intervention->id,
                            'error' => $e->getMessage(),
                        ]
                    );
                }
            } else {
                $emailFailed++;

                Log::warning(
                    'VIOLA Notify Parent skipped because parent has no email.',
                    [
                        'parent_id' => $parent->id,
                        'intervention_id' => $intervention->id,
                    ]
                );
            }

            /*
             * SMS notification
             *
             * SemaphoreService already normalizes Philippine numbers.
             * If VIOLA is not yet an approved Semaphore Sender Name,
             * this will fail gracefully and be logged.
             */
            if (!empty($parent->phone)) {
                try {
                    $smsMessage =
                        "VIOLA Guidance Update: "
                        . "{$studentName}'s {$violationName} case requires your attention. "
                        . "Please check the VIOLA Parent Portal for the latest details.";

                    app(SemaphoreService::class)->send(
                        (string) $parent->phone,
                        $smsMessage
                    );

                    $smsSent++;
                } catch (\Throwable $e) {
                    $smsFailed++;

                    Log::error(
                        'VIOLA Notify Parent SMS failed.',
                        [
                            'parent_id' => $parent->id,
                            'parent_phone' => $parent->phone,
                            'intervention_id' => $intervention->id,
                            'error' => $e->getMessage(),
                        ]
                    );
                }
            } else {
                $smsFailed++;

                Log::warning(
                    'VIOLA Notify Parent skipped because parent has no phone number.',
                    [
                        'parent_id' => $parent->id,
                        'intervention_id' => $intervention->id,
                    ]
                );
            }
        }

        $messageText =
            'Parent notification sent successfully.';

        if ($smsFailed > 0) {
            $messageText .=
                ' Some SMS messages could not be sent yet.';
        }

        return response()->json([
            'success' => true,

            'message' => $messageText,

            'parent_count' =>
                $parents->count(),

            'email_sent' =>
                $emailSent,

            'email_failed' =>
                $emailFailed,

            'sms_sent' =>
                $smsSent,

            'sms_failed' =>
                $smsFailed,
        ]);
    }

    private function sendCaseUpdateEmail(
        ?string $email,
        ?string $recipientName,
        string $studentName,
        string $violationName,
        string $interventionType,
        string $interventionStatus,
        string $caseStatus
    ): void {
        if (empty($email)) {
            return;
        }

        try {
            $caseStatusText = ucfirst(
                str_replace('_', ' ', $caseStatus)
            );

            $interventionStatusText = ucfirst(
                str_replace('_', ' ', $interventionStatus)
            );

            $emailTitle =
                $interventionStatus === 'completed'
                    ? 'Case Closed'
                    : 'Intervention Updated';

            $bodyMessage =
                $interventionStatus === 'completed'
                    ? "The intervention for {$studentName}'s {$violationName} case has been completed and the case is now closed."
                    : "The intervention for {$studentName}'s {$violationName} case has been updated by the Guidance Office.";

            $emailSubject =
                "VIOLA - {$studentName} Case {$caseStatusText}";

            Mail::send(
                'emails.intervention-updated',
                [
                    'recipientName' => $recipientName,
                    'studentName' => $studentName,
                    'violationName' => $violationName,
                    'interventionType' => $interventionType,
                    'interventionStatusLabel' => $interventionStatusText,
                    'caseStatusLabel' => $caseStatusText,
                    'emailTitle' => $emailTitle,
                    'bodyMessage' => $bodyMessage,
                ],
                function ($mail) use (
                    $email,
                    $emailSubject
                ) {
                    $mail
                        ->to($email)
                        ->subject($emailSubject);
                }
            );
        } catch (\Throwable $e) {
            Log::error(
                'VIOLA case update email failed.',
                [
                    'email' => $email,
                    'student_name' => $studentName,
                    'error' => $e->getMessage(),
                ]
            );
        }
    }
}
