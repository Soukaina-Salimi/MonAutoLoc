<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OwnerService;
use App\Models\User;
use Illuminate\Http\Request;

class OwnerServiceController extends Controller
{
    // ── GET /api/service-owners/{id} — public ─────────────────────────────
public function show(int $id)
{
    $owner = User::with(['ownerServices', 'documents'])
        ->whereHas('role', fn($q) => $q->where('name', 'owner'))
        ->find($id);

    if (!$owner) {
        return response()->json(['message' => 'Prestataire introuvable'], 404);
    }

    return response()->json([
        'id'                 => $owner->id,
        'name'               => $owner->name,
        'full_name'          => $owner->name,
        'display_name'       => $owner->is_agency && $owner->agency_name
            ? $owner->agency_name
            : $owner->name,
        'email'              => $owner->email,
        'phone'              => $owner->phone,
        'city'               => $owner->city,
        'bio'                => $owner->bio,
        'avatar'             => $owner->avatar
            ? asset('storage/' . $owner->avatar)
            : null,
        // Agence
        'is_agency'          => (bool) $owner->is_agency,
        'agency_name'        => $owner->agency_name,
        'agency_logo_url'    => $owner->agency_logo
            ? asset('storage/' . $owner->agency_logo)
            : null,
        'agency_description' => $owner->agency_description,
        'agency_rc'          => $owner->agency_rc,
        'agency_phone'       => $owner->agency_phone,
        'agency_website'     => $owner->agency_website,
        // Stats
        'rating'             => 4.8,  // TODO: calculer depuis review-service
        'reviews_count'      => 0,
        'requests_completed' => 0,
        'verified'           => $owner->documents()
            ->where('status', 'verified')->exists(),
        'member_since'       => $owner->created_at
            ? $owner->created_at->format('Y')
            : '2024',
        'base_price'         => $owner->ownerServices
            ->where('is_active', true)
            ->min('base_price'),
        'coverage_area'      => $owner->ownerServices
            ->where('is_active', true)
            ->first()?->coverage_area,
        'services'           => $owner->ownerServices
            ->where('is_active', true)
            ->map(fn($s) => $s->service_type)
            ->values(),
    ]);
}
    // ── GET /api/service-owners?service=X — public ────────────────────────
    public function publicIndex(Request $request)
    {
        $serviceType = $request->query('service');

        $query = User::with(['ownerServices', 'documents'])
            ->whereHas('role', fn($q) => $q->where('name', 'owner'))
            ->whereHas('ownerServices', function ($q) use ($serviceType) {
                $q->where('is_active', true);
                if ($serviceType) {
                    $q->where('service_type', $serviceType);
                }
            });

        $owners = $query->get()->map(fn($owner) => [
            'id'                => $owner->id,
            'name'              => $owner->name,
            'display_name'      => $owner->is_agency && $owner->agency_name
                ? $owner->agency_name
                : $owner->name,
            'email'             => $owner->email,
            'phone'             => $owner->phone,
            'city'              => $owner->city,
            'bio'               => $owner->bio,
            'avatar'            => $owner->avatar
                ? asset('storage/' . $owner->avatar)
                : null,
            'is_agency'         => $owner->is_agency,
            'agency_name'       => $owner->agency_name,
            'agency_logo_url'   => $owner->agency_logo
                ? asset('storage/' . $owner->agency_logo)
                : null,
            'agency_rc'         => $owner->agency_rc,
            'agency_phone'      => $owner->agency_phone,
            'agency_website'    => $owner->agency_website,
            'verified'          => $owner->documents()
                ->where('status', 'verified')
                ->exists(),
            'services'          => $owner->ownerServices
                ->where('is_active', true)
                ->map(fn($s) => $s->service_type)
                ->values(),
        ]);

        return response()->json($owners);
    }

    // ── GET /api/owner-services — owner connecté ──────────────────────────
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->ownerServices()->get()
        );
    }

    // ── POST /api/owner-services ──────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'service_type' => 'required|in:location,transport_bagages,livraison_colis,demenagement',
            'description'  => 'nullable|string|max:500',
            'base_price'   => 'nullable|numeric|min:0',
        ]);

        $service = $request->user()->ownerServices()->updateOrCreate(
            ['service_type' => $request->service_type],
            [
                'is_active'   => true,
                'description' => $request->description,
                'base_price'  => $request->base_price,
            ]
        );

        return response()->json($service, 201);
    }

    // ── PUT /api/owner-services/{id} ──────────────────────────────────────
    public function update(Request $request, int $id)
    {
        $service = OwnerService::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $service->update($request->only([
            'is_active', 'description', 'base_price', 'coverage_area'
        ]));

        return response()->json($service);
    }

    // ── DELETE /api/owner-services/{id} ───────────────────────────────────
    public function destroy(Request $request, int $id)
    {
        $service = OwnerService::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $service->delete();

        return response()->json(['success' => true]);
    }

    // ── GET /api/users/{id}/services — interne ────────────────────────────
    public function userServices(int $id)
    {
        $services = OwnerService::where('user_id', $id)
            ->where('is_active', true)
            ->get();

        return response()->json($services);
    }
}