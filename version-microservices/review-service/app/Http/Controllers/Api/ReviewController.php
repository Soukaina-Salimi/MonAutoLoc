<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReviewController extends Controller
{
    private function getAuthUser(Request $request): ?object
    {
        $u = $request->auth_user;
        if (!$u) return null;
        return (object)[
            'id'   => $u['id'],
            'role' => (object)$u['role'],
        ];
    }

    // ── GET /api/reviews/vehicule/{id} — public ───────────────────────────
    public function byVehicule(int $vehiculeId)
    {
        $reviews = Review::where('vehicule_id', $vehiculeId)
            ->latest()
            ->get();

        // Enrichir avec les infos client
        $result = $reviews->map(function ($review) {
            $clientInfo = [];
            try {
                $res = Http::timeout(5)->get(
                    env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$review->user_id}"
                );
                if ($res->successful()) $clientInfo = $res->json();
            } catch (\Exception $e) {
                Log::warning('Review byVehicule fetchUser error: ' . $e->getMessage());
            }

            return [
                'id'         => $review->id,
                'rating'     => $review->rating,
                'comment'    => $review->comment,
                'created_at' => $review->created_at,
                'user' => [
                    'id'     => $review->user_id,
                    'name'   => $clientInfo['name']   ?? 'Client #' . $review->user_id,
                    'avatar' => $clientInfo['avatar']  ?? null,
                ],
            ];
        });

        return response()->json($result);
    }

    // ── GET /api/reviews/vehicule/{id}/rating — interne ───────────────────
    public function rating(int $vehiculeId)
    {
        $reviews = Review::where('vehicule_id', $vehiculeId)->get();

        return response()->json([
            'vehicule_id' => $vehiculeId,
            'count'       => $reviews->count(),
            'average'     => $reviews->count() > 0
                ? round($reviews->avg('rating'), 1)
                : null,
        ]);
    }

    // ── POST /api/reviews ─────────────────────────────────────────────────
    public function store(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

            $request->validate([
                'vehicule_id' => 'required|integer',
                'booking_id'  => 'required|integer',
                'rating'      => 'required|integer|min:1|max:5',
                'comment'     => 'nullable|string|max:1000',
            ]);

            // Vérifier qu'un avis n'existe pas déjà pour ce booking
            $exists = Review::where('booking_id', $request->booking_id)->exists();
            if ($exists) {
                return response()->json([
                    'message' => 'Vous avez déjà laissé un avis pour cette réservation'
                ], 422);
            }

            // Vérifier que le booking est completed et appartient au client
            try {
                $bookingRes = Http::timeout(5)->get(
                    env('BOOKING_SERVICE_URL', 'http://booking-service') .
                    "/api/vehicules/{$request->vehicule_id}/active-bookings"
                );
            } catch (\Exception $e) {
                Log::warning('Review store booking check failed: ' . $e->getMessage());
            }

            $review = Review::create([
                'vehicule_id' => $request->vehicule_id,
                'user_id'     => $user->id,
                'booking_id'  => $request->booking_id,
                'rating'      => $request->rating,
                'comment'     => $request->comment,
            ]);

            return response()->json($review, 201);

        } catch (\Exception $e) {
            Log::error('Review store error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    // ── GET /api/reviews/my ───────────────────────────────────────────────
    public function myReviews(Request $request)
    {
        $user    = $this->getAuthUser($request);
        $reviews = Review::where('user_id', $user->id)->latest()->get();
        return response()->json($reviews);
    }

    // ── DELETE /api/reviews/{id} ──────────────────────────────────────────
    public function destroy(Request $request, int $id)
    {
        $user   = $this->getAuthUser($request);
        $review = Review::findOrFail($id);

        $isOwner = $review->user_id === $user->id;
        $isAdmin = $user->role->name === 'admin';

        if (!$isOwner && !$isAdmin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $review->delete();
        return response()->json(['success' => true]);
    }

    // ── GET /api/reviews/check-by-booking/{id} — interne ─────────────────
    public function checkByBooking(int $bookingId)
    {
        $exists = Review::where('booking_id', $bookingId)->exists();
        return response()->json(['exists' => $exists]);
    }
}