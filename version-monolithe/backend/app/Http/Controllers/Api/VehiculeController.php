<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class VehiculeController extends Controller
{
    public function index()
    {
        $vehicles =

            Vehicule::with(['user', 'images'])->latest()->get();

        return response()->json($vehicles);
    }


    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$user->isOwner()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $rules = [
            'brand' => 'required|string|max:255',
            'model' => 'required|string|max:255',
            'category' => 'required|string|in:voiture,moto,scooter,camion,utilitaire,van,velo,trottinette,quad,bateau',
            'year' => 'required|integer|min:1900|max:' . date('Y'),
            'price_per_day' => 'required|numeric|min:0',
            'fuel_type' => 'nullable|string|max:50',
            'transmission' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'puissance' => 'required|integer|min:1|max:1000',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:4096'
        ];

        // Validation conditionnelle selon la catégorie
        if (in_array($request->category, ['voiture', 'utilitaire', 'van'])) {
            $rules['seats'] = 'required|integer|min:1|max:50';
        }

        if (in_array($request->category, ['moto', 'scooter', 'quad'])) {
            $rules['engine_cc'] = 'required|integer|min:50|max:5000';
        }

        $request->validate($rules);

        $vehicleData = [
            'user_id' => $user->id,
            'brand' => $request->brand,
            'model' => $request->model,
            'category' => $request->category,
            'year' => $request->year,
            'price_per_day' => $request->price_per_day,
            'fuel_type' => $request->fuel_type ?? 'Essence',
            'transmission' => $request->transmission ?? 'Manuelle',
            'seats' => $request->seats,
            'engine_cc' => $request->engine_cc,
            'city' => $request->city,
            'address' => $request->address,
            'description' => $request->description,
            'puissance' => $request->puissance
        ];

        $vehicle = Vehicule::create($vehicleData);

        // Upload multiple images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('vehicules', 'public');
                $vehicle->images()->create([
                    'path' => $path
                ]);
            }
        }

        return response()->json($vehicle->load('images'), 201);
    }

    public function show($id)
    {
        $now = now();

        $vehicule = Vehicule::with([
            'user',
            'images',
            'reviews.user',
            'bookings' => function ($query) use ($now) {
                $query->where('status', 'approved')
                    ->where(function ($q) use ($now) {
                        $q->whereBetween('start_date', [$now, $now])
                            ->orWhereBetween('end_date', [$now, $now])
                            ->orWhere(function ($q2) use ($now) {
                                $q2->where('start_date', '<=', $now)
                                    ->where('end_date', '>=', $now);
                            });
                    });
            }
        ])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating')
            ->findOrFail($id);

        // Le véhicule est disponible s'il n'y a pas de réservations actives
        $vehicule->available = $vehicule->bookings->isEmpty();

        foreach ($vehicule->images as $image) {
            $image->url = asset('storage/' . $image->path);
        }

        return response()->json($vehicule);
    }

    public function update(Request $request, $id)
    {
        $vehicle = Vehicule::with('images')->findOrFail($id);
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user || !$user->isOwner() || $vehicle->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $rules = [
            'brand' => 'required|string|max:255',
            'model' => 'required|string|max:255',
            'category' => 'nullable|string|in:voiture,moto,scooter,camion,utilitaire,van,velo,trottinette,quad,bateau',
            'year' => 'required|integer|min:1900|max:' . date('Y'),
            'price_per_day' => 'required|numeric|min:0',
            'fuel_type' => 'nullable|string|max:50',
            'transmission' => 'nullable|string|max:50',
            'seats' => 'nullable|integer|min:1|max:50',
            'engine_cc' => 'nullable|integer|min:50|max:5000',
            'city' => 'nullable|string|max:255',
            'puissance' => 'required|integer|min:1|max:1000',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:4096',
            'deleted_images' => 'nullable|array',
            'deleted_images.*' => 'integer|exists:vehicule_images,id',
        ];

        // Validation conditionnelle selon la catégorie
        if ($request->filled('category')) {
            if (in_array($request->category, ['voiture', 'utilitaire', 'van'])) {
                $rules['seats'] = 'required|integer|min:1|max:50';
            }

            if (in_array($request->category, ['moto', 'scooter', 'quad'])) {
                $rules['engine_cc'] = 'required|integer|min:50|max:5000';
            }
        }

        $request->validate($rules);

        DB::transaction(function () use ($request, $vehicle) {
            // Suppression des images sélectionnées
            if ($request->filled('deleted_images')) {
                $imagesToDelete = $vehicle->images()
                    ->whereIn('id', $request->deleted_images)
                    ->get();

                foreach ($imagesToDelete as $image) {
                    if (Storage::disk('public')->exists($image->path)) {
                        Storage::disk('public')->delete($image->path);
                    }
                    $image->delete();
                }
            }

            // Ajout des nouvelles images
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $path = $file->store('vehicules', 'public');
                    $vehicle->images()->create([
                        'path' => $path
                    ]);
                }
            }

            // Mise à jour du véhicule avec tous les champs
            $vehicle->update([
                'brand' => $request->brand,
                'model' => $request->model,
                'category' => $request->category ?? $vehicle->category,
                'year' => $request->year,
                'price_per_day' => $request->price_per_day,
                'fuel_type' => $request->fuel_type ?? $vehicle->fuel_type,
                'transmission' => $request->transmission ?? $vehicle->transmission,
                'seats' => $request->seats ?? $vehicle->seats,
                'engine_cc' => $request->engine_cc ?? $vehicle->engine_cc,
                'city' => $request->city ?? $vehicle->city,
                'puissance' => $request->puissance ?? $vehicle->puissance,
                'address' => $request->address ?? $vehicle->address,
                'description' => $request->description,
            ]);
        });

        return response()->json([
            'message' => 'Vehicle updated successfully',
            'vehicle' => $vehicle->fresh()->load('images')
        ]);
    }

    public function destroy($id)
    {
        $vehicle = Vehicule::findOrFail($id);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isOwner() || $vehicle->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        foreach ($vehicle->images as $image) {
            if (Storage::disk('public')->exists($image->path)) {
                Storage::disk('public')->delete($image->path);
            }
        }


        $vehicle->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }

    // Dans votre contrôleur
    public function getBookedDates($id)
    {
        $bookings = Booking::where('vehicule_id', $id)
            ->where('status', 'approved')
            ->get(['start_date', 'end_date']);

        $bookedDates = [];

        foreach ($bookings as $booking) {
            $start = new \DateTime($booking->start_date);
            $end = new \DateTime($booking->end_date);
            $interval = new \DateInterval('P1D');
            $period = new \DatePeriod($start, $interval, $end->modify('+1 day'));

            foreach ($period as $date) {
                $bookedDates[] = $date->format('Y-m-d');
            }
        }

        return response()->json($bookedDates);
    }
}
