<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ServiceRequestController extends Controller
{
    // ── GET /api/service-requests — owner ─────────────────────────────────
    public function ownerRequests(Request $request)
    {
        try {
            $user = $request->user();

            $requests = ServiceRequest::where('owner_id', $user->id)
                ->latest()
                ->get();

            return response()->json($requests->map(fn($r) => $this->formatRequest($r)));
        } catch (\Exception $e) {
            Log::error('ownerRequests error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }
    // GET /api/service-requests/my — réservations du client connecté
    public function myRequests(Request $request)
    {
        $user = $request->user();
        $requests = ServiceRequest::where('client_id', $user->id)
            ->with('owner:id,name,email,phone')
            ->latest()
            ->get()
            ->map(function ($r) {
                return [
                    'id'               => $r->id,
                    'service_type'     => $r->service_type,
                    'status'           => $r->status,
                    'pickup_address'   => $r->pickup_address,
                    'delivery_address' => $r->delivery_address,
                    'pickup_city'      => $r->pickup_city,
                    'delivery_city'    => $r->delivery_city,
                    'pickup_date'      => $r->pickup_date,
                    'pickup_time'      => $r->pickup_time,
                    'estimated_price'  => $r->estimated_price,
                    'final_price'      => $r->final_price,
                    'client_notes'     => $r->client_notes,
                    'created_at'       => $r->created_at,
                    'owner'            => $r->owner ? [
                        'id'    => $r->owner->id,
                        'name'  => $r->owner->name,
                        'email' => $r->owner->email,
                        'phone' => $r->owner->phone,
                    ] : null,
                ];
            });

        return response()->json($requests);
    }


    // ── POST /api/service-requests ────────────────────────────────────────
    public function store(Request $request)
    {
        try {
            $request->validate([
                'owner_id'        => 'required|integer|exists:users,id',
                'service_type'    => 'required|in:transport_bagages,livraison_colis,demenagement',
                'pickup_city'     => 'required|string|max:100',
                'delivery_city'   => 'required|string|max:100',
                'pickup_address'  => 'nullable|string|max:255',
                'delivery_address' => 'nullable|string|max:255',
                'pickup_date'     => 'required|date|after_or_equal:today',
                'pickup_time'     => 'nullable|date_format:H:i',
                'service_details' => 'nullable|array',
                'client_notes'    => 'nullable|string|max:500',
                'estimated_price' => 'nullable|numeric|min:0',
            ]);

            $serviceRequest = ServiceRequest::create([
                'client_id'        => $request->user()->id,
                'owner_id'         => $request->owner_id,
                'service_type'     => $request->service_type,
                'status'           => 'pending',
                'pickup_city'      => $request->pickup_city,
                'delivery_city'    => $request->delivery_city,
                'pickup_address'   => $request->pickup_address,
                'delivery_address' => $request->delivery_address,
                'pickup_date'      => $request->pickup_date,
                'pickup_time'      => $request->pickup_time,
                'service_details'  => $request->service_details,
                'client_notes'     => $request->client_notes,
                'estimated_price'  => $request->estimated_price,
            ]);

            return response()->json($this->formatRequest($serviceRequest), 201);
        } catch (\Exception $e) {
            Log::error('ServiceRequest store error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la création'], 500);
        }
    }

    // ── GET /api/service-requests/{id} ───────────────────────────────────
    public function show(Request $request, int $id)
    {
        $sr   = ServiceRequest::findOrFail($id);
        $user = $request->user();

        if ($sr->client_id !== $user->id && $sr->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($this->formatRequest($sr));
    }

    // ── PATCH /api/service-requests/{id}/status — owner ───────────────────
    public function updateStatus(Request $request, int $id)
    {
        try {
            $request->validate([
                'status'      => 'required|in:confirmed,in_progress,completed,rejected',
                'owner_notes' => 'nullable|string|max:500',
                'final_price' => 'nullable|numeric|min:0',
            ]);

            $sr   = ServiceRequest::findOrFail($id);
            $user = $request->user();

            if ($sr->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $sr->update([
                'status'      => $request->status,
                'owner_notes' => $request->owner_notes ?? $sr->owner_notes,
                'final_price' => $request->final_price ?? $sr->final_price,
            ]);

            return response()->json($this->formatRequest($sr->fresh()));
        } catch (\Exception $e) {
            Log::error('ServiceRequest updateStatus error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }

    // ── PATCH /api/service-requests/{id}/cancel ───────────────────────────
    public function cancel(Request $request, int $id)
    {
        $sr   = ServiceRequest::findOrFail($id);
        $user = $request->user();

        if ($sr->client_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($sr->status, ['completed', 'cancelled', 'rejected'])) {
            return response()->json(['message' => 'Cette demande ne peut pas être annulée'], 422);
        }

        $sr->update(['status' => 'cancelled']);

        return response()->json($this->formatRequest($sr->fresh()));
    }

    // ── Helper ────────────────────────────────────────────────────────────
    private function formatRequest(ServiceRequest $r): array
    {
        // Récupérer infos client
        $client = User::find($r->client_id);

        return [
            'id'               => $r->id,
            'service_type'     => $r->service_type,
            'status'           => $r->status,
            'pickup_city'      => $r->pickup_city,
            'delivery_city'    => $r->delivery_city,
            'pickup_address'   => $r->pickup_address,
            'delivery_address' => $r->delivery_address,
            'pickup_date'      => $r->pickup_date,
            'pickup_time'      => $r->pickup_time,
            'service_details'  => $r->service_details,
            'client_notes'     => $r->client_notes,
            'owner_notes'      => $r->owner_notes,
            'estimated_price'  => $r->estimated_price,
            'final_price'      => $r->final_price,
            'created_at'       => $r->created_at,
            'client_name'      => $client?->name,
            'client_email'     => $client?->email,
            'client_phone'     => $client?->phone,
        ];
    }
}
