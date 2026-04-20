<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$user->isClient()) {
            return response()->json(['message' => 'Only clients can review'], 403);
        }

        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000'
        ]);

        $booking = Booking::findOrFail($request->booking_id);

        // 🔒 Sécurité critique
        if ($booking->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($booking->status !== 'completed') {
            return response()->json(['message' => 'Cannot review unfinished booking'], 400);
        }

        // 🔒 Empêcher double review
        if (Review::where('booking_id', $booking->id)->exists()) {
            return response()->json(['message' => 'Already reviewed'], 400);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'vehicule_id' => $booking->vehicule_id,
            'booking_id' => $booking->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        return response()->json($review, 201);
    }

    public function canReview($vehiculeId)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user || !$user->isClient()) {
            return response()->json(['canReview' => false]);
        }

        $now = now(); // Date actuelle

        $booking = Booking::where('user_id', $user->id)
            ->where('vehicule_id', $vehiculeId)
            ->where(function ($query) use ($now) {
                $query->where('status', 'approved')  // Réservations approuvées
                    ->orWhere('status', 'completed'); // Ou déjà complétées
            })
            ->where('end_date', '<', $now)  // Date de fin passée
            ->whereDoesntHave('review')
            ->first();

        // Si on trouve une réservation avec date de fin passée, on peut review
        if ($booking) {
            return response()->json([
                'canReview' => true,
                'booking_id' => $booking->id
            ]);
        }

        return response()->json([
            'canReview' => false,
            'booking_id' => null
        ]);
    }
}
