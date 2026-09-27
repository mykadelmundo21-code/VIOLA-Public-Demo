<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentViolationController extends Controller
{
    public function index(
        Request $request
    ): JsonResponse {
        $parent = $request->user();

        if (
            !$parent ||
            $parent->role !== 'parent'
        ) {
            return response()->json([
                'message' =>
                    'Only parent accounts can access this resource.',
            ], 403);
        }

        $student =
            $parent->children()
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->first();

        if (!$student) {
            return response()->json([
                'student' => null,
                'violations' => [],
            ]);
        }

        $violations =
            $student->violations()
                ->with([
                    'violationType',
                ])
                ->orderByDesc(
                    'incident_at'
                )
                ->orderByDesc('id')
                ->get()
                ->map(
                    function (
                        $violation
                    ) {
                        return [
                            'id' =>
                                $violation->id,

                            'type' =>
                                $violation
                                    ->violationType
                                    ?->name ??
                                'Violation',

                            'category' =>
                                $violation
                                    ->violationType
                                    ?->category,

                            'date' =>
                                $violation
                                    ->incident_at
                                    ?->format(
                                        'M d, Y'
                                    ) ??
                                'No date',

                            'description' =>
                                $violation->description,

                            'status' =>
                                match (
                                    $violation->status
                                ) {
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
                                                $violation->status
                                            )
                                        ),
                                },

                            'rawStatus' =>
                                $violation->status,

                            'updatedAt' =>
                                $violation
                                    ->updated_at
                                    ?->toISOString(),

                            'createdAt' =>
                                $violation
                                    ->created_at
                                    ?->toISOString(),
                        ];
                    }
                )
                ->values();

        return response()->json([
            'student' => [
                'id' =>
                    $student->id,

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

                'student_id' =>
                    $student->student_id,

                'grade' =>
                    $student->grade_level,

                'section' =>
                    $student->section,
            ],

            'violations' =>
                $violations,
        ]);
    }
}