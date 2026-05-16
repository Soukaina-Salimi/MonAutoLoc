<?php
// auth-service/app/Http/Controllers/Api/SubscriptionController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiFeature;
use App\Models\Subscription;
use App\Models\OwnerAiFeature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SubscriptionController extends Controller
{
    // ── GET /api/ai-features ──────────────────────────────────────────────
    // Liste toutes les features avec prix + statut pour cet owner
    public function features(Request $request)
    {
        $owner    = $request->user();
        $features = AiFeature::all();

        // Features actives de cet owner
        $activeFeatures = OwnerAiFeature::where('owner_id', $owner->id)
            ->where('active', true)
            ->pluck('feature_id')
            ->toArray();

        // Abonnements en attente
        $pendingFeatures = Subscription::where('owner_id', $owner->id)
            ->where('status', 'pending')
            ->pluck('feature_id')
            ->toArray();

        // Abonnements actifs avec date expiration
        $activeSubs = Subscription::where('owner_id', $owner->id)
            ->where('status', 'active')
            ->get()
            ->keyBy('feature_id');

        return response()->json(
            $features->map(function ($f) use ($activeFeatures, $pendingFeatures, $activeSubs) {
                $sub = $activeSubs->get($f->id);
                return [
                    'id'            => $f->id,
                    'feature_name'  => $f->feature_name,
                    'description'   => $f->description,
                    'monthly_price' => (float) $f->monthly_price,
                    'is_free'       => $f->monthly_price == 0,
                    'is_active'     => in_array($f->id, $activeFeatures),
                    'is_pending'    => in_array($f->id, $pendingFeatures),
                    'expires_at'    => $sub?->expires_at,
                    'started_at'    => $sub?->started_at,
                    'subscription_id' => $sub?->id,
                ];
            })
        );
    }

    // ── POST /api/subscriptions ───────────────────────────────────────────
    // Owner souscrit à UNE feature spécifique
    public function store(Request $request)
    {
        $request->validate([
            'feature_id'        => 'required|exists:ai_features,id',
            'payment_proof'     => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'payment_method'    => 'nullable|string|max:100',
            'payment_reference' => 'nullable|string|max:200',
        ]);

        $owner   = $request->user();
        $feature = AiFeature::findOrFail($request->feature_id);

        // Vérifier si déjà actif ou en attente
        $existing = Subscription::where('owner_id', $owner->id)
            ->where('feature_id', $feature->id)
            ->whereIn('status', ['active', 'pending'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => $existing->status === 'active'
                    ? 'Vous êtes déjà abonné à cette fonctionnalité.'
                    : 'Votre demande est déjà en cours de traitement.',
            ], 422);
        }

        // Feature gratuite → activation immédiate
        if ($feature->monthly_price == 0) {
            $sub = Subscription::create([
                'owner_id'        => $owner->id,
                'feature_id'      => $feature->id,
                'status'          => 'active',
                'payment_amount'  => 0,
                'started_at'      => now(),
                'expires_at'      => null,
            ]);

            $this->activateFeature($owner->id, $feature->id);

            return response()->json([
                'success'  => true,
                'message'  => "✅ {$feature->feature_name} activée gratuitement !",
                'auto'     => true,
                'subscription' => $sub,
            ], 201);
        }

        // Feature payante → en attente de validation admin
        $proofPath = null;
        if ($request->hasFile('payment_proof')) {
            $proofPath = $request->file('payment_proof')
                ->store("payment_proofs/{$owner->id}/{$feature->feature_name}", 'public');
        }

        $sub = Subscription::create([
            'owner_id'          => $owner->id,
            'feature_id'        => $feature->id,
            'status'            => 'pending',
            'payment_amount'    => $feature->monthly_price,
            'payment_proof'     => $proofPath,
            'payment_method'    => $request->payment_method,
            'payment_reference' => $request->payment_reference,
        ]);

        return response()->json([
            'success'      => true,
            'message'      => "Demande envoyée ! Validation sous 24h ouvrées.",
            'auto'         => false,
            'subscription' => $sub,
        ], 201);
    }

    // ── GET /api/subscriptions/my ─────────────────────────────────────────
    public function my(Request $request)
    {
        $owner = $request->user();

        $subs = Subscription::where('owner_id', $owner->id)
            ->with('feature')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(
            $subs->map(fn($s) => [
                'id'             => $s->id,
                'feature_name'   => $s->feature->feature_name,
                'feature_desc'   => $s->feature->description,
                'monthly_price'  => (float) $s->feature->monthly_price,
                'status'         => $s->status,
                'payment_amount' => $s->payment_amount,
                'payment_method' => $s->payment_method,
                'admin_notes'    => $s->admin_notes,
                'started_at'     => $s->started_at,
                'expires_at'     => $s->expires_at,
                'created_at'     => $s->created_at->format('d/m/Y'),
            ])
        );
    }

    // ── DELETE /api/subscriptions/{id}/cancel ─────────────────────────────
    public function cancel(Request $request, int $id)
    {
        $sub = Subscription::where('id', $id)
            ->where('owner_id', $request->user()->id)
            ->firstOrFail();

        // Désactiver la feature
        if ($sub->status === 'active') {
            OwnerAiFeature::where('owner_id', $request->user()->id)
                ->where('feature_id', $sub->feature_id)
                ->update(['active' => false, 'activated_at' => null]);
        }

        $sub->update(['status' => 'cancelled']);

        return response()->json(['success' => true]);
    }

    // ── ADMIN : PATCH /api/admin/subscriptions/{id}/activate ──────────────
    public function activate(Request $request, int $id)
    {
        $sub = Subscription::with('feature')->findOrFail($id);

        $sub->update([
            'status'      => 'active',
            'started_at'  => now(),
            'expires_at'  => now()->addDays(30),
            'admin_notes' => $request->admin_notes,
        ]);

        $this->activateFeature($sub->owner_id, $sub->feature_id);

        return response()->json([
            'success'  => true,
            'message'  => "Feature '{$sub->feature->feature_name}' activée pour l'owner #{$sub->owner_id}",
        ]);
    }

    // ── ADMIN : PATCH /api/admin/subscriptions/{id}/reject ────────────────
    public function reject(Request $request, int $id)
    {
        $sub = Subscription::findOrFail($id);
        $sub->update([
            'status'      => 'cancelled',
            'admin_notes' => $request->admin_notes,
        ]);
        return response()->json(['success' => true]);
    }

    // ── ADMIN : GET /api/admin/subscriptions ──────────────────────────────
    public function index(Request $request)
    {
        $query = Subscription::with(['feature', 'owner'])
            ->orderByDesc('created_at');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $subs = $query->paginate(20);

        return response()->json([
            'data' => $subs->map(fn($s) => [
                'id'             => $s->id,
                'status'         => $s->status,
                'payment_amount' => $s->payment_amount,
                'payment_method' => $s->payment_method,
                'payment_proof'  => $s->payment_proof
                    ? asset('storage/' . $s->payment_proof)
                    : null,
                'payment_reference' => $s->payment_reference,
                'admin_notes'    => $s->admin_notes,
                'created_at'     => $s->created_at->format('d/m/Y H:i'),
                'started_at'     => $s->started_at?->format('d/m/Y'),
                'expires_at'     => $s->expires_at?->format('d/m/Y'),
                'feature' => [
                    'name'  => $s->feature->feature_name,
                    'price' => $s->feature->monthly_price,
                ],
                'owner' => [
                    'id'    => $s->owner->id,
                    'name'  => $s->owner->agency_name ?? $s->owner->name,
                    'email' => $s->owner->email,
                    'phone' => $s->owner->phone,
                ],
            ]),
            'total'       => $subs->total(),
            'current_page' => $subs->currentPage(),
            'last_page'   => $subs->lastPage(),
        ]);
    }

    // ── Helper : activer une feature en BDD ───────────────────────────────
    private function activateFeature(int $ownerId, int $featureId): void
    {
        OwnerAiFeature::updateOrCreate(
            ['owner_id' => $ownerId, 'feature_id' => $featureId],
            ['active' => true, 'activated_at' => now()]
        );
    }
}
