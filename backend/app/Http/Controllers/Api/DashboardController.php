<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Vehicule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function ownerDashboard()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isOwner()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Total earnings (approved only)
        $totalEarnings = Booking::whereHas('vehicule', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
            ->where('status', 'approved')
            ->sum('total_price');

        // Total bookings
        $totalBookings = Booking::whereHas('vehicule', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->count();

        // Active vehicles
        $totalVehicles = Vehicule::where('user_id', $user->id)->count();

        // Revenue by month (approved only)
        $monthlyRevenue = Booking::select(
            DB::raw('MONTH(start_date) as month'),
            DB::raw('SUM(total_price) as total')
        )
            ->whereHas('vehicule', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->where('status', 'approved')
            ->groupBy(DB::raw('MONTH(start_date)'))
            ->orderBy('month')
            ->get();

        return response()->json([
            'total_earnings' => $totalEarnings,
            'total_bookings' => $totalBookings,
            'total_vehicles' => $totalVehicles,
            'monthly_revenue' => $monthlyRevenue
        ]);
    }
    public function clientDashboard()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isClient()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Active bookings
        $activeBookings = $user->bookings()
            ->where('status', 'approved')
            ->where('end_date', '>=', now())
            ->count();

        // History
        $history = $user->bookings()
            ->whereIn('status', ['approved', 'rejected', 'cancelled'])
            ->count();

        // Total spent
        $totalSpent = $user->bookings()
            ->where('status', 'approved')
            ->sum('total_price');

        return response()->json([
            'active_bookings' => $activeBookings,
            'history_count' => $history,
            'total_spent' => $totalSpent
        ]);
    }
}
