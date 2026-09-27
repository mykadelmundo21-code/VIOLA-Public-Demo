<?php

namespace App\Http\Controllers;

use App\Models\ParentInformation;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class GuidanceAccountController extends Controller
{
    private function authorizeGuidance(Request $request): ?JsonResponse
    {
        $user = $request->user();

        if (!$user || $user->role !== 'guidance') {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        return null;
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function generateTemporaryPassword(): string
    {
        return Str::random(10);
    }

    private function sendTemporaryPasswordEmail(
        User $user,
        string $temporaryPassword
    ): bool {
        try {
            $name = htmlspecialchars(
                $user->name,
                ENT_QUOTES,
                'UTF-8'
            );

            $email = htmlspecialchars(
                $user->email,
                ENT_QUOTES,
                'UTF-8'
            );

            $password = htmlspecialchars(
                $temporaryPassword,
                ENT_QUOTES,
                'UTF-8'
            );

            $role = ucfirst(
                strtolower($user->role)
            );

            Mail::send([], [], function ($message) use (
                $email,
                $name,
                $password,
                $role
            ) {
                $message
                    ->to($email)
                    ->subject('VIOLA Account Credentials')
                    ->html("
                        <div style=\"font-family:Arial,sans-serif;background:#f3f4f6;padding:30px;\">
                            <div style=\"max-width:600px;margin:auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;\">

                                <div style=\"margin-bottom:24px;\">
                                    <div style=\"display:inline-block;background:#111827;color:#ffffff;padding:10px 16px;border-radius:10px;font-size:22px;font-weight:bold;\">
                                        <span style=\"color:#dc2626;\">V</span>IOLA
                                    </div>
                                </div>

                                <h2 style=\"color:#111827;margin-bottom:8px;\">
                                    Your VIOLA Account
                                </h2>

                                <p style=\"color:#4b5563;line-height:1.6;\">
                                    Hello {$name},
                                </p>

                                <p style=\"color:#4b5563;line-height:1.6;\">
                                    Your {$role} account has been created in VIOLA.
                                    Use the temporary credentials below to sign in.
                                </p>

                                <div style=\"background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;\">

                                    <p style=\"margin:0 0 10px;color:#6b7280;font-size:13px;\">
                                        EMAIL
                                    </p>

                                    <p style=\"margin:0 0 18px;color:#111827;font-weight:bold;\">
                                        {$email}
                                    </p>

                                    <p style=\"margin:0 0 10px;color:#6b7280;font-size:13px;\">
                                        TEMPORARY PASSWORD
                                    </p>

                                    <p style=\"margin:0;color:#dc2626;font-size:20px;font-weight:bold;letter-spacing:1px;\">
                                        {$password}
                                    </p>

                                </div>

                                <div style=\"background:#fef2f2;border-left:4px solid #dc2626;padding:14px 16px;margin-bottom:24px;\">
                                    <p style=\"margin:0;color:#991b1b;line-height:1.5;\">
                                        For security, you will be required to change this temporary password when you first log in.
                                    </p>
                                </div>

                                <p style=\"color:#4b5563;line-height:1.6;\">
                                    Please keep your account credentials private.
                                </p>

                                <p style=\"color:#9ca3af;font-size:12px;margin-top:28px;\">
                                    VIOLA • An Intelligent Student Violation Monitoring
                                </p>

                            </div>
                        </div>
                    ");
            });

            return true;
        } catch (\Throwable $e) {
            \Log::error(
                'Failed to send VIOLA temporary password email.',
                [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]
            );

            return false;
        }
    }

    public function checkEmail(Request $request): JsonResponse
    {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
            ],
        ]);

        $email = $this->normalizeEmail(
            $validated['email']
        );

        $user = User::whereRaw(
            'LOWER(email) = ?',
            [$email]
        )->first();

        if (!$user) {
            return response()->json([
                'available' => true,
                'exists' => false,
                'message' => 'Email is available.',
            ]);
        }

        return response()->json([
            'available' => false,
            'exists' => true,
            'role' => $user->role,
            'message' => 'This email is already registered.',
        ]);
    }

    public function createTeacher(Request $request): JsonResponse
    {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $email = $this->normalizeEmail($validated['email']);

        $existing = User::whereRaw(
            'LOWER(email) = ?',
            [$email]
        )->first();

        if ($existing) {
            return response()->json([
                'message' =>
                    'This email is already registered. A duplicate teacher account cannot be created.',
                'existingRole' => $existing->role,
            ], 409);
        }

        $temporaryPassword = $this->generateTemporaryPassword();

        $teacherCandidate = new User([
            'name' => trim($validated['name']),
            'email' => $email,
            'role' => 'teacher',
            'phone' => $validated['phone'] ?? null,
        ]);

        $emailSent = $this->sendTemporaryPasswordEmail(
            $teacherCandidate,
            $temporaryPassword
        );

        if (!$emailSent) {
            return response()->json([
                'message' =>
                    'We could not send the account details to the email address provided. Please check the email address and try again.',
                'data' => [
                    'name' => $teacherCandidate->name,
                    'email' => $teacherCandidate->email,
                    'phone' => $teacherCandidate->phone,
                    'role' => 'teacher',
                    'emailSent' => false,
                    'accountCreated' => false,
                ],
            ], 422);
        }

        $teacher = DB::transaction(function () use (
            $validated,
            $email,
            $temporaryPassword
        ) {
            return User::create([
                'name' => trim($validated['name']),
                'email' => $email,
                'password' => Hash::make($temporaryPassword),
                'must_change_password' => true,
                'role' => 'teacher',
                'phone' => $validated['phone'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Teacher account created successfully. The account details have been sent to the email address provided.',
            'data' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'role' => $teacher->role,
                'mustChangePassword' => true,
                'emailSent' => true,
                'accountCreated' => true,
            ],
        ], 201);
    }

    public function createParent(Request $request): JsonResponse
    {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'student_lrn' => ['required', 'string', 'max:255'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $lrn = trim($validated['student_lrn']);

        $student = Student::where('student_id', $lrn)->first();

        if (!$student) {
            return response()->json([
                'message' =>
                    'Student LRN was not found. Please check the LRN and try again.',
            ], 422);
        }

        $parentInformation = ParentInformation::where(
            'student_id',
            $student->id
        )->first();

        if (!$parentInformation) {
            return response()->json([
                'message' =>
                    'Parent information is not available for this student. Please ask the teacher to register the parent information first.',
            ], 422);
        }

        $existing = User::whereRaw(
            'LOWER(email) = ?',
            [$email]
        )->first();

        if ($existing && $existing->role !== 'parent') {
            return response()->json([
                'message' =>
                    'This email address is already being used for another type of account. Please use a different email address.',
                'existingRole' => $existing->role,
            ], 409);
        }

        if ($existing) {
            $alreadyLinked = DB::table('parent_students')
                ->where('parent_id', $existing->id)
                ->where('student_id', $student->id)
                ->exists();

            if ($alreadyLinked) {
                return response()->json([
                    'message' =>
                        'This parent is already linked to this student.',
                ], 409);
            }

            DB::table('parent_students')->insert([
                'parent_id' => $existing->id,
                'student_id' => $student->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'message' =>
                    'The existing parent account has been linked to the student successfully.',
                'data' => [
                    'id' => $existing->id,
                    'name' => $existing->name,
                    'email' => $existing->email,
                    'phone' => $existing->phone,
                    'role' => $existing->role,
                    'mustChangePassword' =>
                        (bool) $existing->must_change_password,
                    'existingAccount' => true,
                    'emailSent' => false,
                    'accountCreated' => false,
                    'student' => [
                        'id' => $student->id,
                        'lrn' => $student->student_id,
                        'name' => trim(
                            $student->first_name . ' ' .
                            (
                                $student->middle_name
                                    ? $student->middle_name . ' '
                                    : ''
                            ) .
                            $student->last_name
                        ),
                    ],
                ],
            ]);
        }

        $temporaryPassword = $this->generateTemporaryPassword();

        /*
         * Try the email before creating the account.
         * If the mail server immediately rejects the message,
         * nothing is saved and the Guidance user can correct the email.
         */
        $parentCandidate = new User([
            'name' => trim($validated['name']),
            'email' => $email,
            'role' => 'parent',
            'phone' => $validated['phone'] ?? null,
        ]);

        $emailSent = $this->sendTemporaryPasswordEmail(
            $parentCandidate,
            $temporaryPassword
        );

        if (!$emailSent) {
            return response()->json([
                'message' =>
                    'We could not send the account details to the email address provided. Please check the email address and try again.',
                'data' => [
                    'name' => $parentCandidate->name,
                    'email' => $parentCandidate->email,
                    'phone' => $parentCandidate->phone,
                    'role' => 'parent',
                    'emailSent' => false,
                    'accountCreated' => false,
                    'student' => [
                        'id' => $student->id,
                        'lrn' => $student->student_id,
                        'name' => trim(
                            $student->first_name . ' ' .
                            (
                                $student->middle_name
                                    ? $student->middle_name . ' '
                                    : ''
                            ) .
                            $student->last_name
                        ),
                    ],
                ],
            ], 422);
        }

        $parent = DB::transaction(function () use (
            $validated,
            $email,
            $temporaryPassword,
            $student
        ) {
            $parent = User::create([
                'name' => trim($validated['name']),
                'email' => $email,
                'password' => Hash::make($temporaryPassword),
                'must_change_password' => true,
                'role' => 'parent',
                'phone' => $validated['phone'] ?? null,
            ]);

            DB::table('parent_students')->insert([
                'parent_id' => $parent->id,
                'student_id' => $student->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $parent;
        });

        return response()->json([
            'message' =>
                'Parent account created successfully. The account details have been sent to the email address provided.',
            'data' => [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
                'phone' => $parent->phone,
                'role' => $parent->role,
                'mustChangePassword' => true,
                'existingAccount' => false,
                'emailSent' => true,
                'accountCreated' => true,
                'student' => [
                    'id' => $student->id,
                    'lrn' => $student->student_id,
                    'name' => trim(
                        $student->first_name . ' ' .
                        (
                            $student->middle_name
                                ? $student->middle_name . ' '
                                : ''
                        ) .
                        $student->last_name
                    ),
                ],
            ],
        ], 201);
    }

    public function resendParentCredentials(
        Request $request,
        int $id
    ): JsonResponse {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'student_lrn' => ['required', 'string', 'max:255'],
        ]);

        $parent = User::where('id', $id)
            ->where('role', 'parent')
            ->first();

        if (!$parent) {
            return response()->json([
                'message' =>
                    'The parent account could not be found.',
            ], 404);
        }

        $email = $this->normalizeEmail($validated['email']);
        $lrn = trim($validated['student_lrn']);

        $student = Student::where('student_id', $lrn)->first();

        if (!$student) {
            return response()->json([
                'message' =>
                    'Student LRN was not found. Please check the LRN and try again.',
            ], 422);
        }

        $isLinked = DB::table('parent_students')
            ->where('parent_id', $parent->id)
            ->where('student_id', $student->id)
            ->exists();

        if (!$isLinked) {
            return response()->json([
                'message' =>
                    'This parent is not linked to the student with the provided LRN.',
            ], 422);
        }

        $existing = User::whereRaw(
            'LOWER(email) = ?',
            [$email]
        )
            ->where('id', '!=', $parent->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' =>
                    'This email address is already being used by another account. Please use a different email address.',
            ], 409);
        }

        $temporaryPassword = $this->generateTemporaryPassword();

        /*
         * Send to the new address first.
         * The existing account is changed only after the send succeeds.
         */
        $emailCandidate = new User([
            'name' => $parent->name,
            'email' => $email,
            'role' => 'parent',
            'phone' => $parent->phone,
        ]);

        $emailSent = $this->sendTemporaryPasswordEmail(
            $emailCandidate,
            $temporaryPassword
        );

        if (!$emailSent) {
            return response()->json([
                'message' =>
                    'We could not send the account details to this email address. Please check the email address and try again.',
                'data' => [
                    'id' => $parent->id,
                    'name' => $parent->name,
                    'email' => $parent->email,
                    'emailSent' => false,
                    'accountUpdated' => false,
                    'student' => [
                        'id' => $student->id,
                        'lrn' => $student->student_id,
                        'name' => trim(
                            $student->first_name . ' ' .
                            (
                                $student->middle_name
                                    ? $student->middle_name . ' '
                                    : ''
                            ) .
                            $student->last_name
                        ),
                    ],
                ],
            ], 422);
        }

        $parent->email = $email;
        $parent->password = Hash::make($temporaryPassword);
        $parent->must_change_password = true;
        $parent->save();

        return response()->json([
            'message' =>
                'The email address was updated and the new account details were sent successfully.',
            'data' => [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
                'phone' => $parent->phone,
                'role' => $parent->role,
                'mustChangePassword' => true,
                'emailSent' => true,
                'accountUpdated' => true,
                'student' => [
                    'id' => $student->id,
                    'lrn' => $student->student_id,
                    'name' => trim(
                        $student->first_name . ' ' .
                        (
                            $student->middle_name
                                ? $student->middle_name . ' '
                                : ''
                        ) .
                        $student->last_name
                    ),
                ],
            ],
        ]);
    }

    public function bulkTeachers(Request $request): JsonResponse
    {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:csv,txt',
                'max:5120',
            ],
        ]);

        $rows = $this->readCsv($request->file('file'));

        if (empty($rows)) {
            return response()->json([
                'message' =>
                    'The uploaded file is empty or invalid.',
            ], 422);
        }

        $invalid = [];
        $valid = [];
        $seenEmails = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $name = trim($row['name'] ?? '');
            $email = $this->normalizeEmail($row['email'] ?? '');
            $phone = trim($row['phone'] ?? '');

            if (!$name || !$email) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'reason' =>
                        'Name and email are required.',
                ];
                continue;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'reason' =>
                        'The email address format is invalid.',
                ];
                continue;
            }

            if (isset($seenEmails[$email])) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'reason' =>
                        'This email address appears more than once in the uploaded file.',
                ];
                continue;
            }

            $seenEmails[$email] = true;

            $existing = User::whereRaw(
                'LOWER(email) = ?',
                [$email]
            )->first();

            if ($existing) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'reason' =>
                        'This email address is already registered.',
                ];
                continue;
            }

            $valid[] = [
                'row' => $line,
                'name' => $name,
                'email' => $email,
                'phone' => $phone ?: null,
            ];
        }

        $created = [];
        $emailFailed = 0;

        foreach ($valid as $item) {
            $temporaryPassword =
                $this->generateTemporaryPassword();

            $candidate = new User([
                'name' => $item['name'],
                'email' => $item['email'],
                'role' => 'teacher',
                'phone' => $item['phone'],
            ]);

            $emailSent = $this->sendTemporaryPasswordEmail(
                $candidate,
                $temporaryPassword
            );

            if (!$emailSent) {
                $emailFailed++;

                $invalid[] = [
                    'row' => $item['row'],
                    'name' => $item['name'],
                    'email' => $item['email'],
                    'reason' =>
                        'The account details could not be sent to this email address. Please check the email address.',
                    'emailSent' => false,
                ];

                continue;
            }

            $teacher = User::create([
                'name' => $item['name'],
                'email' => $item['email'],
                'password' => Hash::make($temporaryPassword),
                'must_change_password' => true,
                'role' => 'teacher',
                'phone' => $item['phone'],
            ]);

            $created[] = [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'phone' => $teacher->phone,
                'emailSent' => true,
            ];
        }

        return response()->json([
            'message' =>
                'Bulk teacher account processing completed.',
            'summary' => [
                'uploaded' => count($rows),
                'created' => count($created),
                'invalid' => count($invalid),
                'emailSent' => count($created),
                'emailFailed' => $emailFailed,
            ],
            'created' => $created,
            'invalid' => $invalid,
        ], 201);
    }

    public function bulkParents(Request $request): JsonResponse
    {
        if ($response = $this->authorizeGuidance($request)) {
            return $response;
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:csv,txt',
                'max:5120',
            ],
        ]);

        $rows = $this->readCsv($request->file('file'));

        if (empty($rows)) {
            return response()->json([
                'message' =>
                    'The uploaded file is empty or invalid.',
            ], 422);
        }

        $invalid = [];
        $valid = [];
        $existingParents = [];
        $seenRelationships = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $name = trim($row['name'] ?? '');
            $email = $this->normalizeEmail($row['email'] ?? '');
            $phone = trim($row['phone'] ?? '');
            $lrn = trim($row['student_lrn'] ?? '');

            if (!$name || !$email || !$lrn) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'Name, email, and student LRN are required.',
                ];
                continue;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'The email address format is invalid.',
                ];
                continue;
            }

            $student = Student::where(
                'student_id',
                $lrn
            )->first();

            if (!$student) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'Student LRN was not found.',
                ];
                continue;
            }

            $parentInformation = ParentInformation::where(
                'student_id',
                $student->id
            )->first();

            if (!$parentInformation) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'Parent information is not available for this student. Please ask the teacher to register the parent information first.',
                ];
                continue;
            }

            $relationshipKey =
                $email . '|' . $student->id;

            if (isset($seenRelationships[$relationshipKey])) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'This parent-student relationship appears more than once in the uploaded file.',
                ];
                continue;
            }

            $seenRelationships[$relationshipKey] = true;

            $existing = User::whereRaw(
                'LOWER(email) = ?',
                [$email]
            )->first();

            if (
                $existing &&
                $existing->role !== 'parent'
            ) {
                $invalid[] = [
                    'row' => $line,
                    'name' => $name,
                    'email' => $email,
                    'student_lrn' => $lrn,
                    'reason' =>
                        'This email address is already being used for another type of account.',
                ];
                continue;
            }

            if ($existing) {
                $alreadyLinked = DB::table(
                    'parent_students'
                )
                    ->where(
                        'parent_id',
                        $existing->id
                    )
                    ->where(
                        'student_id',
                        $student->id
                    )
                    ->exists();

                if ($alreadyLinked) {
                    $invalid[] = [
                        'row' => $line,
                        'name' => $name,
                        'email' => $email,
                        'student_lrn' => $lrn,
                        'reason' =>
                            'This parent is already linked to this student.',
                    ];
                    continue;
                }

                $existingParents[] = [
                    'row' => $line,
                    'parentId' => $existing->id,
                    'name' => $existing->name,
                    'email' => $existing->email,
                    'studentId' => $student->id,
                    'studentLrn' => $student->student_id,
                    'studentName' => trim(
                        $student->first_name . ' ' .
                        (
                            $student->middle_name
                                ? $student->middle_name . ' '
                                : ''
                        ) .
                        $student->last_name
                    ),
                ];

                continue;
            }

            $valid[] = [
                'row' => $line,
                'name' => $name,
                'email' => $email,
                'phone' => $phone ?: null,
                'studentId' => $student->id,
                'studentLrn' => $student->student_id,
                'studentName' => trim(
                    $student->first_name . ' ' .
                    (
                        $student->middle_name
                            ? $student->middle_name . ' '
                            : ''
                    ) .
                    $student->last_name
                ),
            ];
        }

        /*
         * Group new parent rows by email.
         * One parent account can be linked to multiple students,
         * so one credentials email is sent per email address.
         */
        $groups = [];

        foreach ($valid as $item) {
            $groups[$item['email']][] = $item;
        }

        $created = [];
        $emailFailed = 0;

        foreach ($groups as $email => $items) {
            $first = $items[0];

            $temporaryPassword =
                $this->generateTemporaryPassword();

            $candidate = new User([
                'name' => $first['name'],
                'email' => $email,
                'role' => 'parent',
                'phone' => $first['phone'],
            ]);

            $emailSent = $this->sendTemporaryPasswordEmail(
                $candidate,
                $temporaryPassword
            );

            if (!$emailSent) {
                $emailFailed++;

                foreach ($items as $item) {
                    $invalid[] = [
                        'row' => $item['row'],
                        'name' => $item['name'],
                        'email' => $item['email'],
                        'student_lrn' =>
                            $item['studentLrn'],
                        'reason' =>
                            'The account details could not be sent to this email address. Please check the email address.',
                        'emailSent' => false,
                    ];
                }

                continue;
            }

            $parent = DB::transaction(function () use (
                $first,
                $email,
                $temporaryPassword,
                $items
            ) {
                $parent = User::create([
                    'name' => $first['name'],
                    'email' => $email,
                    'password' =>
                        Hash::make($temporaryPassword),
                    'must_change_password' => true,
                    'role' => 'parent',
                    'phone' => $first['phone'],
                ]);

                foreach ($items as $item) {
                    DB::table('parent_students')->insert([
                        'parent_id' => $parent->id,
                        'student_id' => $item['studentId'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return $parent;
            });

            $created[] = [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
                'phone' => $parent->phone,
                'emailSent' => true,
                'students' => array_map(
                    fn ($item) => [
                        'lrn' => $item['studentLrn'],
                        'name' => $item['studentName'],
                    ],
                    $items
                ),
            ];
        }

        $linkedExisting = [];

        foreach ($existingParents as $item) {
            DB::transaction(function () use ($item) {
                DB::table('parent_students')->insert([
                    'parent_id' => $item['parentId'],
                    'student_id' => $item['studentId'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

            $linkedExisting[] = $item;
        }

        return response()->json([
            'message' =>
                'Bulk parent account processing completed.',
            'summary' => [
                'uploaded' => count($rows),
                'newAccounts' => count($created),
                'existingParentsLinked' =>
                    count($linkedExisting),
                'invalid' => count($invalid),
                'emailSent' => count($created),
                'emailFailed' => $emailFailed,
            ],
            'created' => $created,
            'existingParentsLinked' => $linkedExisting,
            'invalid' => $invalid,
        ], 201);
    }

    private function readCsv($file): array
    {
        $handle = fopen(
            $file->getRealPath(),
            'r'
        );

        if (!$handle) {
            return [];
        }

        $headers = fgetcsv($handle);

        if (!$headers) {
            fclose($handle);

            return [];
        }

        $headers = array_map(
            function ($header) {
                return strtolower(
                    trim(
                        str_replace(
                            "\xEF\xBB\xBF",
                            '',
                            $header
                        )
                    )
                );
            },
            $headers
        );

        $rows = [];

        while (
            ($data = fgetcsv($handle))
            !== false
        ) {
            if (
                count(
                    array_filter(
                        $data,
                        fn ($value) =>
                            trim(
                                (string) $value
                            ) !== ''
                    )
                ) === 0
            ) {
                continue;
            }

            $row = [];

            foreach (
                $headers as $index => $header
            ) {
                $row[$header] =
                    isset($data[$index])
                        ? trim($data[$index])
                        : '';
            }

            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }
}