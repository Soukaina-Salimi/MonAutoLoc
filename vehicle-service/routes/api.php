<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\VehiculeController;
use App\Http\Controllers\Api\OwnerController;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES — consultation sans auth
// ══════════════════════════════════════════════════════════════════════════════

// Liste tous les véhicules (avec filtres)
Route::get('/vehicules', [VehiculeController::class, 'index']);

// Détail d'un véhicule
Route::get('/vehicules/{id}', [VehiculeController::class, 'show']);

// Liste des propriétaires avec leurs véhicules (page /owners)
Route::get('/owners',     [OwnerController::class, 'index']);
Route::get('/owners/{id}', [OwnerController::class, 'show']);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES — middleware auth.service (valide token via auth-service)
// ══════════════════════════════════════════════════════════════════════════════

Route::middleware('auth.service')->group(function () {

    // ── Véhicules owner ───────────────────────────────────────────────────
    Route::post('/vehicules',         [VehiculeController::class, 'store']);
    Route::put('/vehicules/{id}',     [VehiculeController::class, 'update']);
    Route::delete('/vehicules/{id}',  [VehiculeController::class, 'destroy']);

    // Upload images d'un véhicule
    Route::post('/vehicules/{id}/images',          [VehiculeController::class, 'uploadImages']);
    Route::delete('/vehicules/{id}/images/{imgId}', [VehiculeController::class, 'deleteImage']);

    // Véhicules de l'owner connecté
    Route::get('/owner/vehicules', [VehiculeController::class, 'ownerVehicules']);
    Route::get('/owner/vehicules/{id}', [VehiculeController::class, 'ownerVehiculeShow']); // ← ajouter

    // Changer le statut d'un véhicule (available / unavailable / maintenance)
    Route::patch('/vehicules/{id}/status', [VehiculeController::class, 'updateStatus']);

    Route::get('/owner/stats', [VehiculeController::class, 'stats']);
    Route::get('/owner/recent-bookings', [VehiculeController::class, 'recentBookings']);
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES INTERNES — appelées par booking-service (sans auth)
// ══════════════════════════════════════════════════════════════════════════════

// Dates déjà réservées pour un véhicule (utilisé par le calendrier frontend)
Route::get('/vehicules/{id}/booked-dates',    [VehiculeController::class, 'bookedDates']);

// Réservations actives d'un véhicule
Route::get('/vehicules/{id}/active-bookings', [VehiculeController::class, 'activeBookings']);
