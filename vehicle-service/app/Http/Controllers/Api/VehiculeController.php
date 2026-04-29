<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use App\Models\VehiculeImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class VehiculeController extends Controller
{
    // ── GET /api/vehicules ────────────────────────────────────────────────
    public function index(Request $request)
    {
        $query = Vehicule::with('images')
            ->where('status', 'available');

        if ($request->city)          $query->where('city', 'like', '%' . $request->city . '%');
        if ($request->category)      $query->where('category', $request->category);
        if ($request->fuel_type)     $query->where('fuel_type', $request->fuel_type);
        if ($request->transmission)  $query->where('transmission', $request->transmission);
        if ($request->min_price)     $query->where('price_per_day', '>=', $request->min_price);
        if ($request->max_price)     $query->where('price_per_day', '<=', $request->max_price);
        if ($request->seats)         $query->where('seats', '>=', $request->seats);
        if ($request->offers_driver) $query->where('offers_driver', true);

        $vehicules = $query->latest()->get();

        return response()->json($vehicules->map(fn($v) => $this->formatVehicule($v)));
    }

    // ── GET /api/vehicules/{id} ───────────────────────────────────────────
    public function show(int $id)
    {
        $vehicule = Vehicule::with('images')->findOrFail($id);
        return response()->json($this->formatVehicule($vehicule));
    }

    // ── POST /api/vehicules ───────────────────────────────────────────────
    public function store(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

            $request->validate([
                'brand'          => 'required|string|max:80',
                'model'          => 'required|string|max:80',
                'year'           => 'nullable|integer|min:1990|max:2030',
                'category'       => 'required|string|max:50',
                'fuel_type'      => 'nullable|string|max:30',
                'transmission'   => 'nullable|string|max:30',
                'seats'          => 'nullable|integer|min:1|max:50',
                'price_per_day'  => 'required|numeric|min:0',
                'city'           => 'nullable|string|max:100',
                'address'        => 'nullable|string|max:255',
                'description'    => 'nullable|string|max:1000',
                'immatriculation' => 'nullable|string|max:20',
                'offers_driver'  => 'nullable|boolean',
                'driver_daily_rate' => 'nullable|numeric|min:0',
                // ✅ Ajouter la validation des images
                'images'         => 'nullable|array|max:10',
                'images.*'       => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            ]);

            $vehicule = Vehicule::create([
                'user_id'          => $user->id,
                'brand'            => $request->brand,
                'model'            => $request->model,
                'year'             => $request->year,
                'category'         => $request->category,
                'fuel_type'        => $request->fuel_type,
                'transmission'     => $request->transmission,
                'seats'            => $request->seats,
                'price_per_day'    => $request->price_per_day,
                'city'             => $request->city,
                'address'          => $request->address,
                'description'      => $request->description,
                'immatriculation'  => $request->immatriculation,
                'offers_driver'    => $request->boolean('offers_driver', false),
                'driver_daily_rate' => $request->driver_daily_rate,
                'status'           => 'available',
            ]);

            // ✅ Upload des images
            if ($request->hasFile('images')) {
                $order = 0;
                foreach ($request->file('images') as $file) {
                    $path = $file->store('vehicules', 'public');
                    $vehicule->images()->create([
                        'path'  => $path,
                        'order' => ++$order,
                    ]);
                }
            }

            return response()->json($this->formatVehicule($vehicule->load('images')), 201);
        } catch (\Exception $e) {
            Log::error('Vehicule store error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    // ── GET /api/owner/vehicules/{id} ─────────────────────────────────────────
    public function ownerVehiculeShow(Request $request, int $id)
    {
        $user = $this->getAuthUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $vehicule = Vehicule::with('images')
            ->where('id', $id)
            ->where('user_id', $user->id)  // ← sécurité : seulement SES véhicules
            ->first();

        if (!$vehicule) {
            return response()->json(['message' => 'Véhicule introuvable.'], 404);
        }

        return response()->json($this->formatVehicule($vehicule));
    }
    // ── PUT /api/vehicules/{id} ───────────────────────────────────────────
    public function update(Request $request, int $id)
    {
        $user     = $this->getAuthUser($request);
        $vehicule = Vehicule::with('images')->findOrFail($id);

        if ($vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'price_per_day'     => 'required|numeric|min:0',
            'description'       => 'nullable|string|max:1000',
            'city'              => 'nullable|string|max:100',
            'address'           => 'nullable|string|max:255',
            'offers_driver'     => 'nullable|boolean',
            'driver_daily_rate' => 'nullable|numeric|min:0',
            'images'            => 'nullable|array|max:10',
            'images.*'          => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'deleted_images'    => 'nullable|array',
            'deleted_images.*'  => 'integer',
        ]);

        // ── Mettre à jour les champs texte ────────────────────────────────
        $vehicule->update([
            'price_per_day'     => $request->price_per_day,
            'description'       => $request->description,
            'city'              => $request->city,
            'address'           => $request->address,
            'offers_driver'     => $request->boolean('offers_driver', false),
            'driver_daily_rate' => $request->offers_driver ? $request->driver_daily_rate : null,
        ]);

        // ── Supprimer les images marquées ─────────────────────────────────
        if ($request->filled('deleted_images')) {
            $toDelete = VehiculeImage::whereIn('id', $request->deleted_images)
                ->where('vehicule_id', $id)
                ->get();

            foreach ($toDelete as $img) {
                Storage::disk('public')->delete($img->path);
                $img->delete();
            }
        }

        // ── Ajouter les nouvelles images ──────────────────────────────────
        if ($request->hasFile('images')) {
            $order = $vehicule->images()->max('order') ?? 0;
            foreach ($request->file('images') as $file) {
                $path = $file->store('vehicules', 'public');
                $vehicule->images()->create([
                    'path'  => $path,
                    'order' => ++$order,
                ]);
            }
        }

        return response()->json($this->formatVehicule($vehicule->fresh('images')));
    }

    // ── DELETE /api/vehicules/{id} ────────────────────────────────────────
    public function destroy(Request $request, int $id)
    {
        $user     = $this->getAuthUser($request);
        $vehicule = Vehicule::with('images')->findOrFail($id);

        if ($vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        foreach ($vehicule->images as $img) {
            Storage::disk('public')->delete($img->path);
        }

        $vehicule->delete();

        return response()->json(['success' => true]);
    }

    // ── POST /api/vehicules/{id}/images ───────────────────────────────────
    public function uploadImages(Request $request, int $id)
    {
        $request->validate([
            'images'   => 'required|array|max:10',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $user     = $this->getAuthUser($request);
        $vehicule = Vehicule::findOrFail($id);

        if ($vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $uploaded = [];
        $order    = $vehicule->images()->max('order') ?? 0;

        foreach ($request->file('images') as $file) {
            $path = $file->store('vehicules', 'public');
            $img  = $vehicule->images()->create([
                'path'  => $path,
                'order' => ++$order,
            ]);
            $uploaded[] = [
                'id'  => $img->id,
                'url' => asset('storage/' . $path),
            ];
        }

        return response()->json(['success' => true, 'images' => $uploaded]);
    }

    // ── DELETE /api/vehicules/{id}/images/{imgId} ─────────────────────────
    public function deleteImage(Request $request, int $id, int $imgId)
    {
        $user     = $this->getAuthUser($request);
        $vehicule = Vehicule::findOrFail($id);

        if ($vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $img = VehiculeImage::where('id', $imgId)
            ->where('vehicule_id', $id)
            ->firstOrFail();

        Storage::disk('public')->delete($img->path);
        $img->delete();

        return response()->json(['success' => true]);
    }

    // ── GET /api/owner/vehicules ──────────────────────────────────────────
    public function ownerVehicules(Request $request)
    {
        $user = $this->getAuthUser($request);

        $vehicules = Vehicule::with('images')
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json($vehicules->map(fn($v) => $this->formatVehicule($v)));
    }

    // ── PATCH /api/vehicules/{id}/status ──────────────────────────────────
    public function updateStatus(Request $request, int $id)
    {
        $request->validate([
            'status' => 'required|in:available,unavailable,maintenance',
        ]);

        $user     = $this->getAuthUser($request);
        $vehicule = Vehicule::findOrFail($id);

        if ($vehicule->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vehicule->update(['status' => $request->status]);

        return response()->json(['success' => true, 'status' => $request->status]);
    }

    // ── GET /api/vehicules/{id}/booked-dates — interne ────────────────────
    public function bookedDates(int $id)
    {
        try {
            $response = Http::timeout(5)->get(
                env('BOOKING_SERVICE_URL', 'http://booking-service') . "/api/vehicules/{$id}/booked-dates"
            );
            return response()->json($response->successful() ? $response->json() : []);
        } catch (\Exception $e) {
            return response()->json([]);
        }
    }

    // ── GET /api/vehicules/{id}/active-bookings — interne ─────────────────
    public function activeBookings(int $id)
    {
        try {
            $response = Http::timeout(5)->get(
                env('BOOKING_SERVICE_URL', 'http://booking-service') . "/api/vehicules/{$id}/active-bookings"
            );
            return response()->json($response->successful() ? $response->json() : []);
        } catch (\Exception $e) {
            return response()->json([]);
        }
    }

    // ── Helper auth ───────────────────────────────────────────────────────
    private function getAuthUser(Request $request): ?object
    {
        $u = $request->auth_user;
        if (!$u) return null;
        return (object)[
            'id'   => $u['id'],
            'role' => (object)$u['role'],
        ];
    }

    // ── Helper format ─────────────────────────────────────────────────────
    private function formatVehicule(Vehicule $v): array
    {
        $images = $v->images->sortBy('order')->values();
        $reviews = [];
        $avgRating = null;
        $reviewCount = 0;

        try {
            $response = Http::timeout(3)->get(
                env('REVIEW_SERVICE_URL', 'http://review-service') . "/api/reviews/vehicule/{$v->id}"
            );
            if ($response->successful()) {
                $reviews = $response->json();
                $reviewCount = count($reviews);
                if ($reviewCount > 0) {
                    $sum = array_sum(array_column($reviews, 'rating'));
                    $avgRating = round($sum / $reviewCount, 1);
                }
            }
        } catch (\Exception $e) {
            Log::warning("Could not fetch reviews for vehicule {$v->id}: " . $e->getMessage());
        }
        // 🔥 Récupérer les infos du propriétaire depuis auth-service
        $owner = null;
        try {
            $response = Http::timeout(3)->get(
                env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$v->user_id}"
            );
            if ($response->successful()) {
                $userData = $response->json();
                $owner = [
                    'id' => $userData['id'] ?? $v->user_id,
                    'name' => $userData['name'] ?? 'Propriétaire',
                    'email' => $userData['email'] ?? '',
                    'phone' => $userData['phone'] ?? null,
                    'avatar' => $userData['avatar'] ?? null,
                    'is_agency' => $userData['is_agency'] ?? false,
                    'agency_name' => $userData['agency_name'] ?? null,
                    'agency_logo_url' => $userData['agency_logo_url'] ?? null,
                    'agency_rc' => $userData['agency_rc'] ?? null,
                    'agency_phone' => $userData['agency_phone'] ?? null,
                ];
            }
        } catch (\Exception $e) {
            Log::warning("Could not fetch owner for user_id {$v->user_id}: " . $e->getMessage());
        }

        return [
            'id'               => $v->id,
            'user_id'          => $v->user_id,
            'brand'            => $v->brand,
            'model'            => $v->model,
            'year'             => $v->year,
            'category'         => $v->category,
            'fuel_type'        => $v->fuel_type,
            'transmission'     => $v->transmission,
            'seats'            => $v->seats,
            'price_per_day'    => $v->price_per_day,
            'city'             => $v->city,
            'address'          => $v->address,
            'description'      => $v->description,
            'immatriculation'  => $v->immatriculation,
            'offers_driver'    => $v->offers_driver,
            'driver_daily_rate' => $v->driver_daily_rate,
            'status'           => $v->status,
            'image_url'        => $images->first()
                ? asset('storage/' . $images->first()->path)
                : null,
            'images'           => $images->map(fn($img) => [
                'id'    => $img->id,
                'path'  => $img->path,
                'url'   => asset('storage/' . $img->path),
                'order' => $img->order,
            ])->toArray(),
            'created_at'       => $v->created_at,
            'reviews'          => $reviews,
            'reviews_count'    => $reviewCount,
            'reviews_avg_rating' => $avgRating,
            'user'             => $owner,
        ];
    }

    // vehicle-service/app/Http/Controllers/Api/VehiculeController.php

    // ── GET /api/owner/stats ──────────────────────────────────────────
    public function stats(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Récupérer les véhicules de l'owner
            $vehicules = Vehicule::where('user_id', $user->id)->get();
            $totalVehicles = $vehicules->count();
            $newVehiclesThisMonth = Vehicule::where('user_id', $user->id)
                ->where('created_at', '>=', now()->startOfMonth())
                ->count();

            // Appel à booking-service pour les stats de réservations
            $bookingsStats = $this->getBookingsStats($user->id);

            // Appel à auth-service pour les stats de services
            $servicesStats = $this->getServicesStats($user->id);

            return response()->json([
                'total_earnings' => $bookingsStats['total_earnings'] ?? 0,
                'total_bookings' => $bookingsStats['total_bookings'] ?? 0,
                'total_vehicles' => $totalVehicles,
                'total_service_requests' => $servicesStats['total'] ?? 0,
                'pending_service_requests' => $servicesStats['pending'] ?? 0,
                'confirmed_service_requests' => $servicesStats['confirmed'] ?? 0,
                'completed_service_requests' => $servicesStats['completed'] ?? 0,
                'revenue_this_month' => $bookingsStats['revenue_this_month'] ?? 0,
                'bookings_this_month' => $bookingsStats['bookings_this_month'] ?? 0,
                'vehicles_this_month' => $newVehiclesThisMonth,
            ]);
        } catch (\Exception $e) {
            Log::error('Stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    // ── GET /api/owner/recent-bookings ─────────────────────────────────
    public function recentBookings(Request $request)
    {
        try {
            $user = $this->getAuthUser($request);
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Récupérer les IDs des véhicules de l'owner
            $vehiculeIds = Vehicule::where('user_id', $user->id)->pluck('id')->toArray();

            if (empty($vehiculeIds)) {
                return response()->json([]);
            }

            // Appel à booking-service pour les réservations récentes
            $limit = $request->query('limit', 5);

            $response = Http::timeout(5)->post(
                env('BOOKING_SERVICE_URL', 'http://booking-service') . '/api/bookings/by-vehicules',
                [
                    'vehicule_ids' => $vehiculeIds,
                    'limit' => $limit
                ]
            );

            if (!$response->successful()) {
                return response()->json([]);
            }

            $bookings = $response->json();

            // Enrichir avec les noms des véhicules
            $vehiculesMap = Vehicule::whereIn('id', $vehiculeIds)
                ->get()
                ->keyBy('id')
                ->map(fn($v) => "{$v->brand} {$v->model}")
                ->toArray();

            $result = array_map(function ($booking) use ($vehiculesMap) {
                return [
                    'id' => $booking['id'],
                    'client_name' => $booking['client']['name'] ?? $booking['user']['name'] ?? 'Client',
                    'vehicle_name' => $vehiculesMap[$booking['vehicule_id']] ?? 'Véhicule',
                    'start_date' => $booking['start_date'],
                    'end_date' => $booking['end_date'],
                    'total_price' => $booking['total_price'],
                    'status' => $booking['status'],
                ];
            }, $bookings);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('RecentBookings error: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    // ── Helper pour les stats des réservations ─────────────────────────
    private function getBookingsStats(int $ownerId): array
    {
        try {
            $response = Http::timeout(5)->get(
                env('BOOKING_SERVICE_URL', 'http://booking-service') . "/api/bookings/stats/{$ownerId}"
            );

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::warning('getBookingsStats error: ' . $e->getMessage());
        }

        return [
            'total_earnings' => 0,
            'total_bookings' => 0,
            'revenue_this_month' => 0,
            'bookings_this_month' => 0
        ];
    }

    // ── Helper pour les stats des services ────────────────────────────
    private function getServicesStats(int $ownerId): array
    {
        try {
            $response = Http::timeout(5)->get(
                env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/service-requests/stats/{$ownerId}"
            );

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::warning('getServicesStats error: ' . $e->getMessage());
        }

        return [
            'total' => 0,
            'pending' => 0,
            'confirmed' => 0,
            'completed' => 0
        ];
    }
}
