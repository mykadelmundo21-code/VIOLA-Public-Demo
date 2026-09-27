<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GuidanceDashboardController;
use App\Http\Controllers\GuidanceViolationController;
use App\Http\Controllers\GuidanceStudentController;
use App\Http\Controllers\GuidanceAssessmentController;
use App\Http\Controllers\GuidanceInterventionController;
use App\Http\Controllers\GuidanceArchiveController;
use App\Http\Controllers\GuidanceAccountController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TeacherDashboardController;
use App\Http\Controllers\TeacherStudentController;
use App\Http\Controllers\TeacherViolationController;
use App\Http\Controllers\ParentDashboardController;
use App\Http\Controllers\ParentViolationController;


/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [
    AuthController::class,
    'login'
]);

Route::post('/forgot-password', [
    AuthController::class,
    'forgotPassword'
]);

Route::post('/reset-password', [
    AuthController::class,
    'resetPassword'
]);


/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::get('/me', [
        AuthController::class,
        'me'
    ]);

    Route::post('/logout', [
        AuthController::class,
        'logout'
    ]);

    Route::post('/change-password', [
        AuthController::class,
        'changePassword'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */

    Route::get('/notifications', [
        NotificationController::class,
        'index'
    ]);

    Route::put('/notifications/{notification}/read', [
        NotificationController::class,
        'markAsRead'
    ]);

    Route::put('/notifications/read-all', [
        NotificationController::class,
        'markAllAsRead'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Guidance
    |--------------------------------------------------------------------------
    */

    Route::get('/guidance/dashboard', [
        GuidanceDashboardController::class,
        'index'
    ]);

    Route::get('/guidance/students', [
        GuidanceStudentController::class,
        'index'
    ]);

    Route::get('/guidance/students/{student}', [
        GuidanceStudentController::class,
        'show'
    ]);

    Route::get('/guidance/violations', [
        GuidanceViolationController::class,
        'index'
    ]);

    Route::put('/guidance/violations/{violation}', [
        GuidanceViolationController::class,
        'update'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Guidance Assessment
    |--------------------------------------------------------------------------
    */

    Route::get('/guidance/assessment-suggestions', [
        GuidanceAssessmentController::class,
        'suggestions'
    ]);

    Route::get('/guidance/assessment-suggestions/{violationId}/review', [
        GuidanceAssessmentController::class,
        'review'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Guidance Interventions
    |--------------------------------------------------------------------------
    */

    Route::get('/guidance/interventions', [
        GuidanceInterventionController::class,
        'index'
    ]);

    Route::post('/guidance/interventions', [
        GuidanceInterventionController::class,
        'store'
    ]);

    Route::put('/guidance/interventions/{intervention}', [
        GuidanceInterventionController::class,
        'update'
    ]);

    Route::get('/guidance/interventions/{intervention}/history', [
        GuidanceInterventionController::class,
        'history'
    ]);

    Route::post('/guidance/interventions/{intervention}/notify-parent', [
        GuidanceInterventionController::class,
        'notifyParent'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Guidance Archive History
    |--------------------------------------------------------------------------
    */

    Route::get('/guidance/archive', [
        GuidanceArchiveController::class,
        'index'
    ]);

    Route::get('/guidance/archive/{student}', [
        GuidanceArchiveController::class,
        'show'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Guidance Account Management
    |--------------------------------------------------------------------------
    */

    Route::get('/guidance/accounts/check-email', [
        GuidanceAccountController::class,
        'checkEmail'
    ]);

    Route::post('/guidance/accounts/teacher', [
        GuidanceAccountController::class,
        'createTeacher'
    ]);

    Route::post('/guidance/accounts/parent', [
        GuidanceAccountController::class,
        'createParent'
    ]);

    Route::post('/guidance/accounts/teachers/bulk', [
        GuidanceAccountController::class,
        'bulkTeachers'
    ]);

    Route::post('/guidance/accounts/parents/bulk', [
        GuidanceAccountController::class,
        'bulkParents'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Teacher
    |--------------------------------------------------------------------------
    */

    Route::get('/teacher/dashboard', [
        TeacherDashboardController::class,
        'index'
    ]);

    Route::get('/teacher/students', [
        TeacherStudentController::class,
        'index'
    ]);

    Route::post('/teacher/students', [
        TeacherStudentController::class,
        'store'
    ]);

    Route::post('/teacher/students/bulk', [
        TeacherStudentController::class,
        'bulkStore'
    ]);

    Route::put('/teacher/students/{student}', [
        TeacherStudentController::class,
        'update'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Teacher Violations
    |--------------------------------------------------------------------------
    */

    Route::get('/teacher/violations', [
        TeacherViolationController::class,
        'index'
    ]);

    Route::get('/teacher/violations/students', [
        TeacherViolationController::class,
        'students'
    ]);

    Route::get('/teacher/violations/types', [
        TeacherViolationController::class,
        'types'
    ]);

    Route::post('/teacher/violations', [
        TeacherViolationController::class,
        'store'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Parent
    |--------------------------------------------------------------------------
    */

    Route::get('/parent/dashboard', [
        ParentDashboardController::class,
        'index'
    ]);

    Route::get('/parent/violations', [
        ParentViolationController::class,
        'index'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/settings/profile', [
        SettingsController::class,
        'profile'
    ]);

    Route::put('/settings/profile', [
        SettingsController::class,
        'updateProfile'
    ]);

    Route::post('/settings/profile/photo', [
        SettingsController::class,
        'updatePhoto'
    ]);

    Route::put('/settings/preferences', [
        SettingsController::class,
        'updatePreferences'
    ]);

});