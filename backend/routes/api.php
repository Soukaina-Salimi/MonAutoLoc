<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\VehiculeController;
use App\Http\Controllers\DocumentController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::get('/vehicules', [VehiculeController::class, 'index']);
Route::get('/vehicules/{id}', [VehiculeController::class, 'show']);
Route::get('/owners', [OwnerController::class, 'index']);
Route::get('/owners/{id}', [OwnerController::class, 'show']);
Route::get('/vehicules/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/vehicles/{id}/booked-dates', [VehiculeController::class, 'getBookedDates']);

Route::middleware(['auth:sanctum'])->group(function () {
    // Routes client
    Route::get('/my-bookings', [BookingController::class, 'myBookings']);
    Route::get('/bookings/can-review/{vehicule}', [ReviewController::class, 'canReview']);
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
    Route::get('/client/dashboard', [DashboardController::class, 'clientDashboard']);

    // Routes owner (optionnel - si vous voulez aussi mettre à jour les stats des propriétaires)
    Route::get('/owner-bookings', [BookingController::class, 'ownerBookings']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::get('/owner/dashboard', [DashboardController::class, 'ownerDashboard']);
});

// Routes qui n'ont pas besoin de mise à jour des statuts
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/vehicules', [VehiculeController::class, 'store']);
    Route::delete('/vehicules/{id}', [VehiculeController::class, 'destroy']);
    Route::put('/vehicules/{id}', [VehiculeController::class, 'update']);
    Route::post('/bookings', [BookingController::class, 'store']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/documents/upload', [DocumentController::class, 'upload']);
});
