<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ReviewController;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PUBLIQUES — lecture sans auth
// ══════════════════════════════════════════════════════════════════════════════

// Avis d'un véhicule (affiché sur la page publique du véhicule)
Route::get('/reviews/vehicule/{vehiculeId}', [ReviewController::class, 'byVehicule']);

// Note moyenne d'un véhicule (appelé par vehicle-service)
Route::get('/reviews/vehicule/{vehiculeId}/rating', [ReviewController::class, 'rating']);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES — middleware auth.service
// ══════════════════════════════════════════════════════════════════════════════

Route::middleware('auth.service')->group(function () {

    // Créer un avis (client — après réservation completed)
    Route::post('/reviews', [ReviewController::class, 'store']);

    // Mes avis
    Route::get('/reviews/my', [ReviewController::class, 'myReviews']);

    // Supprimer un avis (client ou admin)
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES INTERNES — appelées par booking-service (sans auth)
// ══════════════════════════════════════════════════════════════════════════════

// Vérifier si un avis existe pour un booking (utilisé par checkReviewable)
Route::get('/reviews/check-by-booking/{bookingId}', [ReviewController::class, 'checkByBooking']);