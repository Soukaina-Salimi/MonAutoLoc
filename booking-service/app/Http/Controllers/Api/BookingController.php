<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\ContractService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    private function getAuthUser(Request $request): ?object
    {
        $u = $request->auth_user;
        if (!$u) return null;
        return (object)[
            'id'   => $u['id'],
            'name' => $u['name'] ?? null,
            'role' => (object)$u['role'],
        ];
    }

    private function isClient(object $user): bool
    {
        return $user->role->name === 'client';
    }

    private function isOwner(object $user): bool
    {
        return $user->role->name === 'owner';
    }

    private function getVehicule(int $id): ?array
    {
        try {
            $res = Http::timeout(5)->get(
                env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules/{$id}"
            );
            return $res->successful() ? $res->json() : null;
        } catch (\Exception $e) {
            Log::error('getVehicule error: ' . $e->getMessage());
            return null;
        }
    }

    private function fetchUserInfo(int $userId): array
    {
        try {
            $res = Http::timeout(5)->get(
                env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$userId}"
            );
            return $res->successful() ? $res->json() : [];
        } catch (\Exception $e) {
            Log::warning('fetchUserInfo error: ' . $e->getMessage());
            return [];
        }
    }

    // ── GET /api/bookings/{id} ────────────────────────────────────────────
    public function show(Request $request, int $id)
    {
        try {
            $user    = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

            $booking  = Booking::with('contract')->findOrFail($id);
            $vehicule = $this->getVehicule($booking->vehicule_id);

            $isClient = $booking->user_id === $user->id;
            $isOwner  = $vehicule && ($vehicule['user_id'] === $user->id);

            if (!$isClient && !$isOwner) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $clientInfo = $this->fetchUserInfo($booking->user_id);

            return response()->json([
                'id'                   => $booking->id,
                'vehicule_id'          => $booking->vehicule_id,
                'user_id'              => $booking->user_id,
                'start_date'           => $booking->start_date,
                'end_date'             => $booking->end_date,
                'total_price'          => $booking->total_price,
                'status'               => $booking->status,
                'with_driver'          => $booking->with_driver,
                'nb_drivers'           => $booking->nb_drivers,
                'driver_price_per_day' => $booking->driver_price_per_day,
                'created_at'           => $booking->created_at,
                'user' => [
                    'id'    => $booking->user_id,
                    'name'  => $clientInfo['name']  ?? 'Client #' . $booking->user_id,
                    'email' => $clientInfo['email'] ?? '',
                    'phone' => $clientInfo['phone'] ?? null,
                ],
                'vehicule' => $vehicule,
                'contract' => $booking->contract ? [
                    'contract_number' => $booking->contract->contract_number,
                    'status'          => $booking->contract->status,
                ] : null,
            ]);
        } catch (\Exception $e) {
            Log::error('show error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    // ── POST /api/bookings ────────────────────────────────────────────────
    public function store(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);
            if (!$this->isClient($user)) return response()->json(['message' => 'Unauthorized'], 403);

            $request->validate([
                'vehicule_id'          => 'required|integer',
                'start_date'           => 'required|date|after_or_equal:today',
                'end_date'             => 'required|date|after:start_date',
                'with_driver'          => 'nullable|boolean',
                'nb_drivers'           => 'nullable|integer|min:0|max:2',
                'driver_price_per_day' => 'nullable|numeric|min:0',
            ]);

            $vehicule = $this->getVehicule($request->vehicule_id);
            if (!$vehicule) return response()->json(['message' => 'Véhicule introuvable'], 404);

            if ($vehicule['user_id'] === $user->id) {
                return response()->json(['message' => 'Vous ne pouvez pas réserver votre propre véhicule'], 403);
            }

            // Vérification conflit de dates
            $conflict = Booking::where('vehicule_id', $request->vehicule_id)
                ->whereIn('status', ['pending', 'approved'])
                ->where(function ($q) use ($request) {
                    $q->where('start_date', '<', $request->end_date)
                        ->where('end_date',   '>', $request->start_date);
                })
                ->exists();

            if ($conflict) {
                return response()->json(['message' => 'Ce véhicule est déjà réservé pour ces dates'], 422);
            }

            // Calcul du prix
            $days          = \Carbon\Carbon::parse($request->start_date)->diffInDays($request->end_date);
            $total         = $days * ($vehicule['price_per_day'] ?? 0);
            $withDriver    = $request->boolean('with_driver', false);
            $nbDrivers     = $withDriver ? (int)$request->input('nb_drivers', 1) : 0;
            $driverPrice   = $withDriver ? $request->input('driver_price_per_day') : null;

            if ($withDriver && $driverPrice) {
                $total += $days * $driverPrice * $nbDrivers;
            }

            $booking = Booking::create([
                'user_id'              => $user->id,
                'vehicule_id'          => $vehicule['id'],
                'start_date'           => $request->start_date,
                'end_date'             => $request->end_date,
                'total_price'          => $total,
                'status'               => 'pending',
                'with_driver'          => $withDriver,
                'nb_drivers'           => $nbDrivers,
                'driver_price_per_day' => $driverPrice,
            ]);

            return response()->json($booking, 201);
        } catch (\Exception $e) {
            Log::error('store error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    // ── GET /api/bookings/my — client ─────────────────────────────────────
    public function myBookings(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

            $bookings = Booking::with('contract')
                ->where('user_id', $user->id)
                ->latest()
                ->get();

            $result = [];
            foreach ($bookings as $booking) {
                $vehicule   = $this->getVehicule($booking->vehicule_id);
                $clientInfo = $this->fetchUserInfo($booking->user_id);
                $owner      = null;

                if ($vehicule && isset($vehicule['user_id'])) {
                    $ownerInfo = $this->fetchUserInfo($vehicule['user_id']);
                    if ($ownerInfo) {
                        $owner = [
                            'id'    => $ownerInfo['id']    ?? $vehicule['user_id'],
                            'name'  => $ownerInfo['agency_name'] ?? $ownerInfo['name'] ?? 'Propriétaire',
                            'email' => $ownerInfo['email'] ?? '',
                            'phone' => $ownerInfo['agency_phone'] ?? $ownerInfo['phone'] ?? null,
                        ];
                    }
                }

                $result[] = [
                    'id'                   => $booking->id,
                    'vehicule_id'          => $booking->vehicule_id,
                    'start_date'           => $booking->start_date,
                    'end_date'             => $booking->end_date,
                    'total_price'          => $booking->total_price,
                    'status'               => $booking->status,
                    'with_driver'          => (bool)$booking->with_driver,
                    'nb_drivers'           => (int)$booking->nb_drivers,
                    'driver_price_per_day' => $booking->driver_price_per_day,
                    'created_at'           => $booking->created_at,
                    'user' => [
                        'id'    => $booking->user_id,
                        'name'  => $clientInfo['name']  ?? 'Client #' . $booking->user_id,
                        'email' => $clientInfo['email'] ?? '',
                        'phone' => $clientInfo['phone'] ?? null,
                    ],
                    'owner'   => $owner,
                    'contract' => $booking->contract ? [
                        'contract_number' => $booking->contract->contract_number,
                        'status'          => $booking->contract->status,
                        'has_pdf'         => !empty($booking->contract->pdf_path),
                    ] : null,
                    'vehicule' => $vehicule ? [
                        'id'           => $vehicule['id'],
                        'brand'        => $vehicule['brand'],
                        'model'        => $vehicule['model'],
                        'year'         => $vehicule['year']          ?? null,
                        'fuel_type'    => $vehicule['fuel_type']     ?? null,
                        'transmission' => $vehicule['transmission']  ?? null,
                        'seats'        => $vehicule['seats']         ?? null,
                        'price_per_day' => $vehicule['price_per_day'] ?? null,
                        'image_url'    => $vehicule['image_url']     ?? null,
                    ] : null,
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('myBookings error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur', 'error' => $e->getMessage()], 500);
        }
    }

    // ── GET /api/bookings/owner — owner ───────────────────────────────────
    public function ownerBookings(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user || !$this->isOwner($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $vehiculesRes = Http::timeout(10)->get(
                env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules"
            );

            if ($vehiculesRes->failed()) {
                return response()->json(['message' => 'Vehicle service unavailable'], 503);
            }

            $vehiculeIds = collect($vehiculesRes->json())
                ->filter(fn($v) => ($v['user_id'] ?? null) === $user->id)
                ->pluck('id')
                ->toArray();

            if (empty($vehiculeIds)) return response()->json([]);

            $bookings = Booking::with('contract')
                ->whereIn('vehicule_id', $vehiculeIds)
                ->latest()
                ->get();

            $result = [];
            foreach ($bookings as $booking) {
                $vehicule   = $this->getVehicule($booking->vehicule_id);
                $clientInfo = $this->fetchUserInfo($booking->user_id);

                $result[] = [
                    'id'                   => $booking->id,
                    'vehicule_id'          => $booking->vehicule_id,
                    'start_date'           => $booking->start_date,
                    'end_date'             => $booking->end_date,
                    'total_price'          => $booking->total_price,
                    'status'               => $booking->status,
                    'with_driver'          => (bool)$booking->with_driver,
                    'nb_drivers'           => (int)$booking->nb_drivers,
                    'driver_price_per_day' => $booking->driver_price_per_day,
                    'created_at'           => $booking->created_at,
                    'contract' => $booking->contract ? [
                        'contract_number' => $booking->contract->contract_number,
                        'status'          => $booking->contract->status,
                        'has_pdf'         => !empty($booking->contract->pdf_path),
                    ] : null,
                    'client' => [
                        'id'    => $booking->user_id,
                        'name'  => $clientInfo['name']  ?? 'Client #' . $booking->user_id,
                        'email' => $clientInfo['email'] ?? '',
                        'phone' => $clientInfo['phone'] ?? null,
                    ],
                    // Alias user = client pour compatibilité frontend
                    'user' => [
                        'id'    => $booking->user_id,
                        'name'  => $clientInfo['name']  ?? 'Client #' . $booking->user_id,
                        'email' => $clientInfo['email'] ?? '',
                        'phone' => $clientInfo['phone'] ?? null,
                    ],
                    'vehicule' => $vehicule ? [
                        'id'           => $vehicule['id'],
                        'brand'        => $vehicule['brand'],
                        'model'        => $vehicule['model'],
                        'year'         => $vehicule['year']          ?? null,
                        'fuel_type'    => $vehicule['fuel_type']     ?? null,
                        'transmission' => $vehicule['transmission']  ?? null,
                        'seats'        => $vehicule['seats']         ?? null,
                        'price_per_day' => $vehicule['price_per_day'] ?? null,
                        'image_url'    => $vehicule['image_url']     ?? null,
                    ] : null,
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('ownerBookings error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur', 'error' => $e->getMessage()], 500);
        }
    }

    // ── PATCH /api/bookings/{id}/status — owner ───────────────────────────
    public function updateStatus(Request $request, int $id)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user || !$this->isOwner($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $request->validate([
                'status' => 'required|in:approved,rejected,completed',
            ]);

            $booking  = Booking::findOrFail($id);
            $vehicule = $this->getVehicule($booking->vehicule_id);

            if (!$vehicule || $vehicule['user_id'] !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $booking->update(['status' => $request->status]);

            // Générer le contrat si approved
            if ($request->status === 'approved') {
                try {
                    $contract = app(ContractService::class)->generateForBooking($booking->fresh());
                    if ($contract) {
                        return response()->json([
                            'message'         => 'Réservation approuvée et contrat généré.',
                            'booking'         => $booking->fresh(),
                            'contract_number' => $contract->contract_number,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Contract generation failed: ' . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Statut mis à jour.',
                'booking' => $booking->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('updateStatus error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    // ── PATCH /api/bookings/{id}/cancel ───────────────────────────────────
    public function cancel(Request $request, int $id)
    {
        try {
            $user    = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

            $booking  = Booking::findOrFail($id);

            if (in_array($booking->status, ['rejected', 'cancelled', 'completed'])) {
                return response()->json(['message' => 'Cette réservation ne peut pas être annulée'], 422);
            }

            $vehicule = $this->getVehicule($booking->vehicule_id);
            $isClient = $booking->user_id === $user->id;
            $isOwner  = $vehicule && ($vehicule['user_id'] === $user->id);

            if (!$isClient && !$isOwner) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $booking->update(['status' => 'cancelled']);

            return response()->json([
                'message' => 'Réservation annulée.',
                'booking' => $booking,
            ]);
        } catch (\Exception $e) {
            Log::error('cancel error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    // ── GET /api/bookings/check-reviewable ────────────────────────────────
    public function checkReviewable(Request $request)
    {
        try {
            $userId     = $request->query('user_id');
            $vehiculeId = $request->query('vehicule_id');

            $booking = Booking::where('user_id', $userId)
                ->where('vehicule_id', $vehiculeId)
                ->where('status', 'completed')
                ->latest()
                ->first();

            if (!$booking) return response()->json(null);

            try {
                $reviewRes = Http::timeout(5)->get(
                    env('REVIEW_SERVICE_URL', 'http://review-service') .
                        "/api/reviews/check-by-booking/{$booking->id}"
                );

                if ($reviewRes->successful()) {
                    $data = $reviewRes->json();
                    if ($data && ($data['exists'] ?? false)) {
                        return response()->json(null);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('checkReviewable review check error: ' . $e->getMessage());
            }

            return response()->json($booking);
        } catch (\Exception $e) {
            Log::error('checkReviewable error: ' . $e->getMessage());
            return response()->json(null);
        }
    }

    // ── GET /api/vehicules/{id}/active-bookings — interne ─────────────────
    public function activeBookings(int $vehiculeId)
    {
        $bookings = Booking::where('vehicule_id', $vehiculeId)
            ->where('status', 'approved')
            ->where('end_date', '>=', now())
            ->get();

        return response()->json($bookings);
    }

    // ── GET /api/vehicules/{id}/booked-dates — interne ────────────────────
    public function bookedDates(int $vehiculeId)
    {
        $bookings = Booking::where('vehicule_id', $vehiculeId)
            ->whereIn('status', ['pending', 'approved'])
            ->get(['start_date', 'end_date']);

        $dates = [];
        foreach ($bookings as $booking) {
            $start    = new \DateTime($booking->start_date);
            $end      = new \DateTime($booking->end_date);
            $interval = new \DateInterval('P1D');
            $period   = new \DatePeriod($start, $interval, $end->modify('+1 day'));
            foreach ($period as $date) {
                $dates[] = $date->format('Y-m-d');
            }
        }

        return response()->json(array_values(array_unique($dates)));
    }

    // ── GET /api/bookings/stats/{ownerId} ─────────────────────────────────
    public function getStats(Request $request, int $ownerId)
    {
        try {
            // Récupérer les IDs des véhicules de l'owner
            $vehiculesRes = Http::timeout(10)->get(
                env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules"
            );

            if ($vehiculesRes->failed()) {
                return response()->json([
                    'total_earnings' => 0,
                    'total_bookings' => 0,
                    'revenue_this_month' => 0,
                    'bookings_this_month' => 0
                ]);
            }

            $vehiculeIds = collect($vehiculesRes->json())
                ->filter(fn($v) => ($v['user_id'] ?? null) === $ownerId)
                ->pluck('id')
                ->toArray();

            if (empty($vehiculeIds)) {
                return response()->json([
                    'total_earnings' => 0,
                    'total_bookings' => 0,
                    'revenue_this_month' => 0,
                    'bookings_this_month' => 0
                ]);
            }

            // Total des réservations
            $totalBookings = Booking::whereIn('vehicule_id', $vehiculeIds)->count();

            // Total des gains (réservations complétées)
            $totalEarnings = Booking::whereIn('vehicule_id', $vehiculeIds)
                ->where('status', 'completed')
                ->sum('total_price');

            // Ce mois-ci
            $monthStart = now()->startOfMonth();
            $bookingsThisMonth = Booking::whereIn('vehicule_id', $vehiculeIds)
                ->where('created_at', '>=', $monthStart)
                ->count();

            $revenueThisMonth = Booking::whereIn('vehicule_id', $vehiculeIds)
                ->where('status', 'completed')
                ->where('created_at', '>=', $monthStart)
                ->sum('total_price');

            return response()->json([
                'total_earnings' => (float) $totalEarnings,
                'total_bookings' => $totalBookings,
                'revenue_this_month' => (float) $revenueThisMonth,
                'bookings_this_month' => $bookingsThisMonth
            ]);
        } catch (\Exception $e) {
            Log::error('getStats error: ' . $e->getMessage());
            return response()->json([
                'total_earnings' => 0,
                'total_bookings' => 0,
                'revenue_this_month' => 0,
                'bookings_this_month' => 0
            ]);
        }
    }

    // ── POST /api/bookings/by-vehicules ─────────────────────────────────
    public function getBookingsByVehicules(Request $request)
    {
        try {
            $vehiculeIds = $request->input('vehicule_ids', []);
            $limit = $request->input('limit', 5);

            if (empty($vehiculeIds)) {
                return response()->json([]);
            }

            $bookings = Booking::with('contract')
                ->whereIn('vehicule_id', $vehiculeIds)
                ->latest()
                ->limit($limit)
                ->get();

            $result = [];
            foreach ($bookings as $booking) {
                $clientInfo = $this->fetchUserInfo($booking->user_id);
                $vehicule = $this->getVehicule($booking->vehicule_id);

                $result[] = [
                    'id' => $booking->id,
                    'vehicule_id' => $booking->vehicule_id,
                    'start_date' => $booking->start_date,
                    'end_date' => $booking->end_date,
                    'total_price' => $booking->total_price,
                    'status' => $booking->status,
                    'created_at' => $booking->created_at,
                    'client' => [
                        'id' => $booking->user_id,
                        'name' => $clientInfo['name'] ?? 'Client #' . $booking->user_id,
                        'email' => $clientInfo['email'] ?? '',
                    ],
                    'user' => [
                        'name' => $clientInfo['name'] ?? 'Client #' . $booking->user_id,
                    ],
                    'vehicle_name' => $vehicule ? ($vehicule['brand'] . ' ' . $vehicule['model']) : 'Véhicule',
                ];
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('getBookingsByVehicules error: ' . $e->getMessage());
            return response()->json([]);
        }
    }


    // GET /api/internal/demand-history?city=Casablanca&category=berline&days=90
    public function demandHistory(Request $request)
    {
        $city     = $request->query('city');
        $category = $request->query('category');
        $days     = (int) $request->query('days', 90);

        // Récupérer les IDs des véhicules de cette ville/catégorie
        $vehiculeIds = [];
        try {
            $vRes = Http::timeout(5)->get(
                env('VEHICLE_SERVICE_URL') . '/api/vehicules',
                ['city' => $city, 'category' => $category]
            );
            if ($vRes->successful()) {
                $vehiculeIds = collect($vRes->json())->pluck('id')->toArray();
            }
        } catch (\Exception $e) {
        }

        if (empty($vehiculeIds)) {
            return response()->json([]);
        }

        // Grouper les réservations par date
        $history = Booking::whereIn('vehicule_id', $vehiculeIds)
            ->where('created_at', '>=', now()->subDays($days))
            ->whereIn('status', ['confirmed', 'completed'])
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as bookings')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        return response()->json(
            $history->map(fn($h) => [
                'date'     => $h->date,
                'bookings' => (int) $h->bookings,
            ])->values()
        );
    }
}
