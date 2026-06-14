<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\OwnerController;

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES OPTIONS — répondre sans auth (preflight CORS)
// Doit être avant le groupe auth.service
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES — middleware auth.service
// ORDRE CRITIQUE : routes spécifiques AVANT les routes avec paramètres {id}
// ══════════════════════════════════════════════════════════════════════════════

Route::middleware('auth.service')->group(function () {

    // ── Réservations client ───────────────────────────────────────────────
    Route::post('/bookings',             [BookingController::class, 'store']);

    // /my et /owner AVANT /{id} — sinon Laravel interprète "my" comme un ID
    Route::get('/bookings/my',           [BookingController::class, 'myBookings']);
    Route::get('/bookings/owner',        [BookingController::class, 'ownerBookings']);
    Route::get('/bookings/check-reviewable', [BookingController::class, 'checkReviewable']);

    // ── Contrats ──────────────────────────────────────────────────────────
    // /bookings/{id}/contract AVANT /bookings/{id}
    Route::get('/bookings/{id}/contract', [ContractController::class, 'downloadByBooking']);
    Route::get('/contracts/{id}/info',    [ContractController::class, 'info']);

    // ── Actions sur une réservation ───────────────────────────────────────
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);

    // ── Détail d'une réservation — EN DERNIER avec {id} ──────────────────
    Route::get('/bookings/{id}',          [BookingController::class, 'show']);

    Route::get('/bookings/stats/{ownerId}', [BookingController::class, 'getStats']);
    Route::post('/bookings/by-vehicules', [BookingController::class, 'getBookingsByVehicules']);

    Route::get('/owner/booking-stats', [OwnerController::class, 'bookingStats']);
    Route::get('/owner/recent-bookings', [OwnerController::class, 'recentBookings']);
    Route::get('/owner/revenue-chart', [OwnerController::class, 'revenueChart']);
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES INTERNES — appelées par vehicle-service (sans auth)
// ══════════════════════════════════════════════════════════════════════════════
// Récupérer l'historique des réservations pour analytics
Route::get('/internal/owner/{ownerId}/bookings-analytics', [BookingController::class, 'ownerBookingsAnalytics'])
    ->name('internal.owner.bookings-analytics');

// Récupérer la liste des clients du propriétaire
Route::get('/internal/owner/{ownerId}/clients', [BookingController::class, 'ownerClients'])
    ->name('internal.owner.clients');

// Récupérer l'historique de demande pour prédiction (déjà existante)
Route::get('/internal/demand-history', [BookingController::class, 'demandHistory']);
Route::get('/vehicules/{id}/active-bookings', [BookingController::class, 'activeBookings']);
Route::get('/vehicules/{id}/booked-dates',    [BookingController::class, 'bookedDates']);
