<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\OwnerServiceController;
use App\Http\Controllers\Api\ServiceCustomizationController;
use App\Http\Controllers\Api\ServiceRequestController;
use App\Http\Controllers\Api\SubscriptionController;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES — pas d'auth requise
// ══════════════════════════════════════════════════════════════════════════════

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES — token Sanctum requis
// ══════════════════════════════════════════════════════════════════════════════

Route::middleware('auth:sanctum')->group(function () {

    // ── Auth ──────────────────────────────────────────────────────────────
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // ── Profil ────────────────────────────────────────────────────────────
    Route::get('/profile',    [ProfileController::class, 'show']);
    Route::put('/profile',    [ProfileController::class, 'update']);
    Route::post('/profile/avatar',       [ProfileController::class, 'uploadAvatar']);
    Route::delete('/profile/avatar',     [ProfileController::class, 'deleteAvatar']);
    Route::post('/profile/agency-logo',  [ProfileController::class, 'uploadAgencyLogo']);
    Route::delete('/profile/agency-logo', [ProfileController::class, 'deleteAgencyLogo']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);

    // ── Documents OCR ─────────────────────────────────────────────────────
    Route::get('/documents',          [DocumentController::class, 'index']);
    Route::post('/documents/upload',  [DocumentController::class, 'upload']);
    Route::delete('/documents/{id}',  [DocumentController::class, 'destroy']);

    // ── Services du propriétaire ──────────────────────────────────────────
    Route::get('/owner-services',         [OwnerServiceController::class, 'index']);
    Route::post('/owner-services',        [OwnerServiceController::class, 'store']);
    Route::put('/owner-services/{id}',    [OwnerServiceController::class, 'update']);
    Route::delete('/owner-services/{id}', [OwnerServiceController::class, 'destroy']);

    Route::get('/owner/customizations',          [ServiceCustomizationController::class, 'ownerIndex']);
    Route::post('/owner/customizations',         [ServiceCustomizationController::class, 'store']);
    Route::delete('/owner/customizations/{id}',  [ServiceCustomizationController::class, 'cancel']);
    // ── Demandes de services (client) ─────────────────────────────────────
    // IMPORTANT : /my AVANT /{id}
    Route::get('/service-requests/my',          [ServiceRequestController::class, 'myRequests']);
    Route::post('/service-requests',             [ServiceRequestController::class, 'store']);
    Route::get('/service-requests/{id}',         [ServiceRequestController::class, 'show']);
    Route::patch('/service-requests/{id}/cancel', [ServiceRequestController::class, 'cancel']);

    // ── Demandes de services (owner) ──────────────────────────────────────
    Route::get('/service-requests',                    [ServiceRequestController::class, 'ownerRequests']);
    Route::patch('/service-requests/{id}/status',      [ServiceRequestController::class, 'updateStatus']);
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES INTERNES — appelées par les autres microservices (sans auth Sanctum)
// Accessibles uniquement depuis le réseau Docker interne
// ══════════════════════════════════════════════════════════════════════════════

// Récupérer un user par ID (appelé par booking-service, vehicle-service, review-service)
Route::get('/users/{id}', [UserController::class, 'show']);

// Liste des owners avec leurs services (appelé par frontend via Nginx)
Route::get('/service-owners', [OwnerServiceController::class, 'publicIndex']);
Route::get('/service-owners/{id}', [OwnerServiceController::class, 'show']);  // ← AJOUTER

// Vérifier si un owner a un service actif (appelé par vehicle-service)
Route::get('/users/{id}/services', [OwnerServiceController::class, 'userServices']);

Route::post('/chatbot/message', [ChatbotController::class, 'message']);


Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/customizations',            [ServiceCustomizationController::class, 'adminIndex']);
    Route::patch('/admin/customizations/{id}',     [ServiceCustomizationController::class, 'adminUpdate']);
});
