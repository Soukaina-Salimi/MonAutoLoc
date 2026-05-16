<?php
// booking-service/app/Http/Controllers/Api/OwnerController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerController extends Controller
{
    // GET /api/owner/booking-stats
    public function bookingStats(Request $request)
    {
        $vehiculeIds = explode(',', $request->query('vehicule_ids', ''));

        if (empty($vehiculeIds)) {
            return response()->json([
                'total' => 0,
                'pending' => 0,
                'confirmed' => 0,
                'completed' => 0,
                'total_earnings' => 0,
                'revenue_this_month' => 0,
                'revenue_last_month' => 0,
                'bookings_this_month' => 0,
                'total_service_requests' => 0,
                'pending_service_requests' => 0,
                'occupation_rate' => 0,
            ]);
        }

        $bookings = Booking::whereIn('vehicule_id', $vehiculeIds);

        return response()->json([
            'total' => (clone $bookings)->count(),
            'pending' => (clone $bookings)->where('status', 'pending')->count(),
            'confirmed' => (clone $bookings)->where('status', 'confirmed')->count(),
            'completed' => (clone $bookings)->where('status', 'completed')->count(),
            'total_earnings' => (clone $bookings)->where('status', 'completed')->sum('total_price'),
            'revenue_this_month' => (clone $bookings)
                ->where('status', 'completed')
                ->whereMonth('created_at', now()->month)
                ->sum('total_price'),
            'revenue_last_month' => (clone $bookings)
                ->where('status', 'completed')
                ->whereMonth('created_at', now()->subMonth()->month)
                ->sum('total_price'),
            'bookings_this_month' => (clone $bookings)
                ->whereMonth('created_at', now()->month)
                ->count(),
            'total_service_requests' => 0,
            'pending_service_requests' => 0,
            'occupation_rate' => 0,
        ]);
    }

    // GET /api/owner/recent-bookings
    public function recentBookings(Request $request)
    {
        $vehiculeIds = explode(',', $request->query('vehicule_ids', ''));
        $limit = (int) $request->query('limit', 5);

        if (empty($vehiculeIds)) {
            return response()->json([]);
        }

        $bookings = Booking::with(['user', 'vehicule'])
            ->whereIn('vehicule_id', $vehiculeIds)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json($bookings);
    }

    // GET /api/owner/revenue-chart
    public function revenueChart(Request $request)
    {
        $vehiculeIds = explode(',', $request->query('vehicule_ids', ''));
        $months = (int) $request->query('months', 6);

        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthStart = $date->copy()->startOfMonth();
            $monthEnd = $date->copy()->endOfMonth();

            $revenue = 0;
            $bookingsCount = 0;

            if (!empty($vehiculeIds)) {
                $revenue = Booking::whereIn('vehicule_id', $vehiculeIds)
                    ->where('status', 'completed')
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->sum('total_price');

                $bookingsCount = Booking::whereIn('vehicule_id', $vehiculeIds)
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->count();
            }

            $data[] = [
                'month' => $date->format('M Y'),
                'revenue' => (float) $revenue,
                'bookings' => $bookingsCount,
            ];
        }

        return response()->json($data);
    }
}
