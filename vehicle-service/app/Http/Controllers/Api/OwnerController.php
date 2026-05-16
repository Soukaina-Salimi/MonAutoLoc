<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class OwnerController extends Controller
{
    // ── GET /api/owners ───────────────────────────────────────────────────
    public function index(Request $request)
    {
        // Récupérer tous les véhicules groupés par user_id
        $vehicules = Vehicule::with('images')
            ->where('status', 'available')
            ->get()
            ->groupBy('user_id');

        $owners = [];
        foreach ($vehicules as $userId => $userVehicules) {
            // Récupérer les infos de l'owner depuis auth-service
            try {
                $userRes = Http::timeout(5)->get(
                    env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$userId}"
                );
                if (!$userRes->successful()) continue;
                $user = $userRes->json();
            } catch (\Exception $e) {
                continue;
            }

            $owners[] = [
                'id'             => $userId,
                'name'           => $user['name'],
                'display_name'   => ($user['is_agency'] && $user['agency_name'])
                    ? $user['agency_name']
                    : $user['name'],
                'email'          => $user['email'],
                'phone'          => $user['phone'],
                'city'           => $user['city'],
                'bio'            => $user['bio'] ?? null,
                'avatar'         => $user['avatar'],
                'is_agency'      => $user['is_agency'],
                'agency_name'    => $user['agency_name'],
                'agency_logo_url' => $user['agency_logo'],
                'agency_rc'      => $user['agency_rc'] ?? null,
                'vehicules_count' => $userVehicules->count(),
                'vehicules'      => $userVehicules->map(fn($v) => [
                    'id'           => $v->id,
                    'brand'        => $v->brand,
                    'model'        => $v->model,
                    'price_per_day' => $v->price_per_day,
                    'image_url'    => $v->images->first()
                        ? asset('storage/' . $v->images->first()->path)
                        : null,
                ])->values(),
            ];
        }

        return response()->json($owners);
    }

    // ── GET /api/owners/{id} ──────────────────────────────────────────────
    // ── GET /api/owners/{id} ──────────────────────────────────────────────
    public function show(int $id)
    {
        try {
            $userRes = Http::timeout(5)->get(
                env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$id}"
            );

            if (!$userRes->successful()) {
                return response()->json(['message' => 'Owner not found'], 404);
            }

            $user      = $userRes->json();
            $vehicules = Vehicule::with('images')
                ->where('user_id', $id)
                ->where('status', 'available')
                ->get();

            // 🔥 Fonction pour nettoyer l'URL
            $cleanUrl = function ($url) {
                if (!$url) return null;
                // Remplacer les URLs internes par l'URL publique
                $url = str_replace('http://auth-service', 'http://localhost', $url);
                $url = str_replace('http://vehicle-service', 'http://localhost', $url);
                return $url;
            };

            return response()->json([
                'id'             => $user['id'],
                'name'           => $user['name'],
                'display_name'   => ($user['is_agency'] && $user['agency_name'])
                    ? $user['agency_name']
                    : $user['name'],
                'email'          => $user['email'],
                'phone'          => $user['phone'],
                'city'           => $user['city'],
                'bio'            => $user['bio'] ?? null,
                'avatar'         => $cleanUrl($user['avatar']),
                'is_agency'      => $user['is_agency'],
                'agency_name'    => $user['agency_name'],
                'agency_logo_url' => $cleanUrl($user['agency_logo']),  // ← Nettoyé
                'agency_description' => $user['agency_description'] ?? null,
                'agency_rc'      => $user['agency_rc'] ?? null,
                'agency_phone'   => $user['agency_phone'] ?? null,
                'agency_website' => $user['agency_website'] ?? null,
                'vehicules_count' => $vehicules->count(),
                'vehicules'      => $vehicules->map(fn($v) => [
                    'id'           => $v->id,
                    'brand'        => $v->brand,
                    'model'        => $v->model,
                    'year'         => $v->year,
                    'category'     => $v->category,
                    'fuel_type'    => $v->fuel_type,
                    'transmission' => $v->transmission,
                    'seats'        => $v->seats,
                    'price_per_day' => $v->price_per_day,
                    'image_url'    => $v->images->first()
                        ? $cleanUrl(asset('storage/' . $v->images->first()->path))
                        : null,
                ])->values(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    public function stats(Request $request)
    {

        // ✅ Utiliser auth_user au lieu de user()
        $authUser = $request->input('auth_user');

        if (!$authUser) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $userId = $authUser['id'];  // ← Récupérer l'ID depuis auth_user


        $vehicles = Vehicule::where('user_id', $userId)->get();
        $vIds     = $vehicles->pluck('id')->toArray();

        // Appel booking-service pour les stats
        $bookingStats = [];
        try {
            $res = Http::withToken($request->bearerToken())
                ->get(env('BOOKING_SERVICE_URL') . '/api/owner/booking-stats', [
                    'vehicule_ids' => implode(',', $vIds)
                ]);
            $bookingStats = $res->json() ?? [];
        } catch (\Exception $e) {
        }

        return response()->json([
            'total_vehicles'             => $vehicles->count(),
            'available_vehicles'         => $vehicles->where('status', 'available')->count(),
            'rented_vehicles'            => $vehicles->where('status', 'rented')->count(),
            'total_bookings'             => $bookingStats['total'] ?? 0,
            'pending_bookings'           => $bookingStats['pending'] ?? 0,
            'confirmed_bookings'         => $bookingStats['confirmed'] ?? 0,
            'completed_bookings'         => $bookingStats['completed'] ?? 0,
            'total_earnings'             => $bookingStats['total_earnings'] ?? 0,
            'revenue_this_month'         => $bookingStats['revenue_this_month'] ?? 0,
            'revenue_last_month'         => $bookingStats['revenue_last_month'] ?? 0,
            'bookings_this_month'        => $bookingStats['bookings_this_month'] ?? 0,
            'avg_rating'                => 0,
            'total_service_requests'     => $bookingStats['total_service_requests'] ?? 0,
            'pending_service_requests'   => $bookingStats['pending_service_requests'] ?? 0,
            'occupation_rate'            => $bookingStats['occupation_rate'] ?? 0,
        ]);
    }

    public function revenueChart(Request $request)
    {
        // ✅ Utiliser auth_user au lieu de user()
        $authUser = $request->input('auth_user');

        if (!$authUser) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $userId = $authUser['id'];  // ← Récupérer l'ID depuis auth_user
        $months = (int) $request->query('months', 6);

        $vIds = Vehicule::where('user_id', $userId)->pluck('id')->toArray();

        try {
            $res = Http::withToken($request->bearerToken())
                ->get(env('BOOKING_SERVICE_URL') . '/api/owner/revenue-chart', [
                    'vehicule_ids' => implode(',', $vIds),
                    'months'       => $months,
                ]);
            return response()->json($res->json());
        } catch (\Exception $e) {
            // Données par défaut si booking-service inaccessible
            $data = [];
            for ($i = $months - 1; $i >= 0; $i--) {
                $date   = now()->subMonths($i);
                $data[] = [
                    'month'    => $date->format('M Y'),
                    'revenue'  => 0,
                    'bookings' => 0,
                ];
            }
            return response()->json($data);
        }
    }

    public function topVehicles(Request $request)
    {
        // ✅ Utiliser auth_user au lieu de user()
        $authUser = $request->input('auth_user');

        if (!$authUser) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $userId = $authUser['id'];  // ← Récupérer l'ID depuis auth_user

        $vehicles = Vehicule::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'id',
                'brand',
                'model',
                'year',
                'price_per_day',
                'city',
                'status',
            ]);

        return response()->json($vehicles);
    }

    public function recentBookings(Request $request)
    {
        // ✅ Utiliser auth_user au lieu de user()
        $authUser = $request->input('auth_user');

        if (!$authUser) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $userId = $authUser['id'];  // ← Récupérer l'ID depuis auth_user


        $limit = (int) $request->query('limit', 5);
        $vIds  = Vehicule::where('user_id', $userId)->pluck('id')->toArray();

        try {
            $res = Http::withToken($request->bearerToken())
                ->get(env('BOOKING_SERVICE_URL') . '/api/owner/recent-bookings', [
                    'vehicule_ids' => implode(',', $vIds),
                    'limit'        => $limit,
                ]);
            return response()->json($res->json());
        } catch (\Exception $e) {
            return response()->json([]);
        }
    }
}
