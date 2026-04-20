<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingController extends Controller
{
    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isClient()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'vehicule_id' => 'required|exists:vehicules,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date'
        ]);

        $vehicule = Vehicule::findOrFail($request->vehicule_id);

        $days = \Carbon\Carbon::parse($request->start_date)
            ->diffInDays($request->end_date);

        $total = $days * $vehicule->price_per_day;

        $conflict = Booking::where('vehicule_id', $request->vehicule_id)
            ->where('status', 'approved')
            ->where(function ($query) use ($request) {
                $query->where(function ($q) use ($request) {
                    $q->where('start_date', '<', $request->end_date)
                        ->where('end_date', '>', $request->start_date);
                });
            })
            ->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'Vehicle already booked for these dates'
            ], 422);
        }
        if ($vehicule->user_id === Auth::id()) {
            return response()->json([
                'message' => 'You cannot book your own vehicle'
            ], 403);
        }
        $booking = Booking::create([
            'user_id' => Auth::id(),
            'vehicule_id' => $vehicule->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_price' => $total,
            'status' => 'pending'
        ]);

        return response()->json($booking);
    }

    #Client → My bookings
    public function myBookings()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        return $user->bookings()
            ->with('vehicule')
            ->get();
    }


    #Owner → Bookings de ses véhicules
    public function ownerBookings()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isOwner()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return Booking::whereHas('vehicule', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->with(['user', 'vehicule'])->get();
    }


    #Owner → Update status
    public function updateStatus(Request $request, $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isOwner()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:approved,rejected'
        ]);

        $booking = Booking::with('vehicule')->findOrFail($id);

        // vérifier que le véhicule appartient à cet owner
        if ($booking->vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $booking->update([
            'status' => $request->status
        ]);

        return response()->json($booking);
    }

    public function cancel($id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $booking = Booking::with('vehicule')->findOrFail($id);

        // 1️⃣ Vérifier statut
        if (in_array($booking->status, ['rejected', 'cancelled'])) {
            return response()->json([
                'message' => 'This booking cannot be cancelled'
            ], 422);
        }

        // 2️⃣ Vérifier autorisation
        $isClient = $booking->user_id === $user->id;
        $isOwner = $booking->vehicule->user_id === $user->id;

        if (!$isClient && !$isOwner) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 3️⃣ Annulation
        $booking->update([
            'status' => 'cancelled'
        ]);

        return response()->json([
            'message' => 'Booking cancelled successfully',
            'booking' => $booking
        ]);
    }
}
