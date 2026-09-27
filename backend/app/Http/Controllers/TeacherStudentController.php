<?php

namespace App\Http\Controllers;

use App\Imports\StudentImport;
use App\Models\ParentInformation;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class TeacherStudentController extends Controller
{
    // Teacher

    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' => 'Only teacher accounts can access this resource.',
            ], 403);
        }

        $students = Student::with([
            'parentInformation',
            'parents',
        ])
            ->where('teacher_id', $teacher->id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'students' => $students->map(function (Student $student) {
                $parentInformation = $student->parentInformation;
                $parentAccount = $student->parents->first();

                return $this->formatStudent(
                    $student,
                    $parentInformation,
                    $parentAccount
                );
            }),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' => 'Only teacher accounts can add students.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'max:50',
                'unique:students,student_id',
            ],
            'first_name' => [
                'required',
                'string',
                'max:100',
            ],
            'middle_name' => [
                'nullable',
                'string',
                'max:100',
            ],
            'last_name' => [
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'contact' => [
                'nullable',
                'string',
                'max:20',
            ],
            'parent_name' => [
                'required',
                'string',
                'max:255',
            ],
            'parent_email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'parent_contact' => [
                'nullable',
                'string',
                'max:20',
            ],
            'grade_level' => [
                'required',
                'in:Grade 11,Grade 12',
            ],
            'section' => [
                'required',
                'string',
                'max:100',
            ],
            'school_year' => [
                'required',
                'string',
                'max:20',
            ],
        ]);

        try {
            $student = DB::transaction(function () use (
                $validated,
                $teacher
            ) {
                $student = Student::create([
                    'student_id' => trim($validated['student_id']),
                    'first_name' => trim($validated['first_name']),
                    'middle_name' => !empty($validated['middle_name'])
                        ? trim($validated['middle_name'])
                        : null,
                    'last_name' => trim($validated['last_name']),
                    'email' => !empty($validated['email'])
                        ? trim($validated['email'])
                        : null,
                    'contact' => !empty($validated['contact'])
                        ? trim($validated['contact'])
                        : null,
                    'grade_level' => $validated['grade_level'],
                    'section' => trim($validated['section']),
                    'school_year' => trim($validated['school_year']),
                    'status' => 'active',
                    'teacher_id' => $teacher->id,
                ]);

                ParentInformation::create([
                    'student_id' => $student->id,
                    'parent_name' => trim($validated['parent_name']),
                    'parent_email' => !empty($validated['parent_email'])
                        ? trim($validated['parent_email'])
                        : null,
                    'parent_contact' => !empty($validated['parent_contact'])
                        ? trim($validated['parent_contact'])
                        : null,
                ]);

                return $student;
            });

            $student = $student
                ->fresh()
                ->load([
                    'parentInformation',
                    'parents',
                ]);

            $parentInformation = $student->parentInformation;
            $parentAccount = $student->parents->first();

            return response()->json([
                'message' => 'Student added successfully.',
                'student' => $this->formatStudent(
                    $student,
                    $parentInformation,
                    $parentAccount
                ),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Unable to add student.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function update(
        Request $request,
        Student $student
    ): JsonResponse {
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' => 'Only teacher accounts can edit students.',
            ], 403);
        }

        if ($student->teacher_id !== $teacher->id) {
            return response()->json([
                'message' => 'You can only edit students assigned to you.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'max:50',
                'unique:students,student_id,' . $student->id,
            ],
            'first_name' => [
                'required',
                'string',
                'max:100',
            ],
            'middle_name' => [
                'nullable',
                'string',
                'max:100',
            ],
            'last_name' => [
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'contact' => [
                'nullable',
                'string',
                'max:20',
            ],
            'parent_name' => [
                'required',
                'string',
                'max:255',
            ],
            'parent_email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'parent_contact' => [
                'nullable',
                'string',
                'max:20',
            ],
            'grade_level' => [
                'required',
                'in:Grade 11,Grade 12',
            ],
            'section' => [
                'required',
                'string',
                'max:100',
            ],
            'school_year' => [
                'required',
                'string',
                'max:20',
            ],
            'status' => [
                'required',
                'in:active,inactive',
            ],
        ]);

        try {
            DB::transaction(function () use (
                $validated,
                $student
            ) {
                $student->update([
                    'student_id' => trim($validated['student_id']),
                    'first_name' => trim($validated['first_name']),
                    'middle_name' => !empty($validated['middle_name'])
                        ? trim($validated['middle_name'])
                        : null,
                    'last_name' => trim($validated['last_name']),
                    'email' => !empty($validated['email'])
                        ? trim($validated['email'])
                        : null,
                    'contact' => !empty($validated['contact'])
                        ? trim($validated['contact'])
                        : null,
                    'grade_level' => $validated['grade_level'],
                    'section' => trim($validated['section']),
                    'school_year' => trim($validated['school_year']),
                    'status' => $validated['status'],
                ]);

                ParentInformation::updateOrCreate(
                    ['student_id' => $student->id],
                    [
                        'parent_name' => trim($validated['parent_name']),
                        'parent_email' => !empty($validated['parent_email'])
                            ? trim($validated['parent_email'])
                            : null,
                        'parent_contact' => !empty($validated['parent_contact'])
                            ? trim($validated['parent_contact'])
                            : null,
                    ]
                );
            });

            $student = $student
                ->fresh()
                ->load([
                    'parentInformation',
                    'parents',
                ]);

            $parentInformation = $student->parentInformation;
            $parentAccount = $student->parents->first();

            return response()->json([
                'message' => 'Student information updated successfully.',
                'student' => $this->formatStudent(
                    $student,
                    $parentInformation,
                    $parentAccount
                ),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage()
                    ?: 'Unable to update student.',
            ], 422);
        }
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $teacher = $request->user();

        if ($teacher->role !== 'teacher') {
            return response()->json([
                'message' => 'Only teacher accounts can upload students.',
            ], 403);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:csv,txt,xlsx,xls',
                'max:10240',
            ],
        ]);

        try {
            $sheets = Excel::toArray(
                new StudentImport(),
                $request->file('file')
            );

            $rows = $sheets[0] ?? [];

            if (empty($rows)) {
                return response()->json([
                    'message' => 'The uploaded file contains no student records.',
                ], 422);
            }

            $created = [];
            $duplicates = [];
            $invalid = [];

            DB::transaction(function () use (
                $rows,
                $teacher,
                &$created,
                &$duplicates,
                &$invalid
            ) {
                $existingIds = Student::pluck('student_id')
                    ->map(fn ($id) => strtolower(trim((string) $id)))
                    ->flip();

                $fileIds = [];

                foreach ($rows as $index => $row) {
                    $rowNumber = $index + 2;

                    $studentId = trim(
                        (string) ($row['student_id'] ?? '')
                    );

                    $firstName = trim(
                        (string) ($row['first_name'] ?? '')
                    );

                    $middleName = trim(
                        (string) ($row['middle_name'] ?? '')
                    );

                    $lastName = trim(
                        (string) ($row['last_name'] ?? '')
                    );

                    $studentEmail = trim(
                        (string) ($row['student_email'] ?? '')
                    );

                    $studentContact = trim(
                        (string) ($row['student_contact'] ?? '')
                    );

                    $parentName = trim(
                        (string) ($row['parent_name'] ?? '')
                    );

                    $parentEmail = trim(
                        (string) ($row['parent_email'] ?? '')
                    );

                    $parentContact = trim(
                        (string) ($row['parent_contact'] ?? '')
                    );

                    $gradeLevel = trim(
                        (string) ($row['grade_level'] ?? '')
                    );

                    $section = trim(
                        (string) ($row['section'] ?? '')
                    );

                    $schoolYear = trim(
                        (string) ($row['school_year'] ?? '')
                    );

                    if (
                        $studentId === '' &&
                        $firstName === '' &&
                        $lastName === '' &&
                        $parentName === '' &&
                        $gradeLevel === '' &&
                        $section === '' &&
                        $schoolYear === ''
                    ) {
                        continue;
                    }

                    if ($gradeLevel === '11') {
                        $gradeLevel = 'Grade 11';
                    }

                    if ($gradeLevel === '12') {
                        $gradeLevel = 'Grade 12';
                    }

                    $validator = Validator::make(
                        [
                            'student_id' => $studentId,
                            'first_name' => $firstName,
                            'middle_name' => $middleName ?: null,
                            'last_name' => $lastName,
                            'email' => $studentEmail ?: null,
                            'contact' => $studentContact ?: null,
                            'parent_name' => $parentName,
                            'parent_email' => $parentEmail ?: null,
                            'parent_contact' => $parentContact ?: null,
                            'grade_level' => $gradeLevel,
                            'section' => $section,
                            'school_year' => $schoolYear,
                        ],
                        [
                            'student_id' => [
                                'required',
                                'string',
                                'max:50',
                            ],
                            'first_name' => [
                                'required',
                                'string',
                                'max:100',
                            ],
                            'middle_name' => [
                                'nullable',
                                'string',
                                'max:100',
                            ],
                            'last_name' => [
                                'required',
                                'string',
                                'max:100',
                            ],
                            'email' => [
                                'nullable',
                                'email',
                                'max:255',
                            ],
                            'contact' => [
                                'nullable',
                                'string',
                                'max:20',
                            ],
                            'parent_name' => [
                                'required',
                                'string',
                                'max:255',
                            ],
                            'parent_email' => [
                                'nullable',
                                'email',
                                'max:255',
                            ],
                            'parent_contact' => [
                                'nullable',
                                'string',
                                'max:20',
                            ],
                            'grade_level' => [
                                'required',
                                'in:Grade 11,Grade 12',
                            ],
                            'section' => [
                                'required',
                                'string',
                                'max:100',
                            ],
                            'school_year' => [
                                'required',
                                'string',
                                'max:20',
                            ],
                        ]
                    );

                    if ($validator->fails()) {
                        $invalid[] = [
                            'row' => $rowNumber,
                            'student_id' => $studentId,
                            'errors' => $validator->errors()->all(),
                        ];

                        continue;
                    }

                    $normalizedId = strtolower($studentId);

                    if (
                        isset($existingIds[$normalizedId]) ||
                        isset($fileIds[$normalizedId])
                    ) {
                        $duplicates[] = [
                            'row' => $rowNumber,
                            'student_id' => $studentId,
                        ];

                        continue;
                    }

                    $student = Student::create([
                        'student_id' => $studentId,
                        'first_name' => $firstName,
                        'middle_name' => $middleName ?: null,
                        'last_name' => $lastName,
                        'email' => $studentEmail ?: null,
                        'contact' => $studentContact ?: null,
                        'grade_level' => $gradeLevel,
                        'section' => $section,
                        'school_year' => $schoolYear,
                        'status' => 'active',
                        'teacher_id' => $teacher->id,
                    ]);

                    ParentInformation::create([
                        'student_id' => $student->id,
                        'parent_name' => $parentName,
                        'parent_email' => $parentEmail ?: null,
                        'parent_contact' => $parentContact ?: null,
                    ]);

                    $created[] = $student->id;
                    $fileIds[$normalizedId] = true;
                }
            });

            return response()->json([
                'message' => 'Student upload completed.',
                'created_count' => count($created),
                'duplicate_count' => count($duplicates),
                'invalid_count' => count($invalid),
                'duplicates' => $duplicates,
                'invalid_rows' => $invalid,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Unable to process the uploaded file.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    private function formatStudent(
        Student $student,
        ?ParentInformation $parent,
        ?User $parentAccount = null
    ): array {
        $resolvedParent = null;

        if ($parentAccount) {
            $resolvedParent = [
                'id' => $parentAccount->id,
                'name' => $parentAccount->name,
                'email' => $parentAccount->email,
                'contact' => $parentAccount->phone,
            ];
        } elseif ($parent) {
            $resolvedParent = [
                'id' => $parent->id,
                'name' => $parent->parent_name,
                'email' => $parent->parent_email,
                'contact' => $parent->parent_contact,
            ];
        }

        return [
            'id' => $student->id,
            'student_id' => $student->student_id,
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'name' => trim(
                $student->first_name . ' ' .
                ($student->middle_name
                    ? $student->middle_name . ' '
                    : '') .
                $student->last_name
            ),
            'email' => $student->email,
            'contact' => $student->contact,
            'grade_level' => $student->grade_level,
            'section' => $student->section,
            'school_year' => $student->school_year,
            'status' => $student->status,
            'parent' => $resolvedParent,
        ];
    }
}