<?php
// auth-service/app/Http/Controllers/Api/ServiceCustomizationController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceCustomization;
use App\Models\OwnerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class ServiceCustomizationController extends Controller
{
    // ── Helper auth ────────────────────────────────────────────────────────
    private function getUser(Request $request): ?object
    {
        $u = $request->user(); // auth:sanctum
        if (!$u) return null;
        return $u;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OWNER ROUTES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/owner/customizations
     * Liste des demandes de l'owner connecté
     */
    public function ownerIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $customizations = ServiceCustomization::where('owner_id', $user->id)
            ->latest()
            ->get()
            ->map(fn($c) => $this->formatCustomization($c));

        return response()->json($customizations);
    }

    /**
     * POST /api/owner/customizations
     * Owner soumet une demande de customisation
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $request->validate([
            'service_type'        => 'required|in:location,transport_bagages,livraison_colis,demenagement',
            'customization_type'  => 'required|in:chatbot_indexing,demand_prediction,recommendations,dynamic_pricing,zone_exclusive,tarif_special,option_supplementaire',
            'description'         => 'required|string|min:20|max:1000',
            'details'             => 'nullable|array',
        ]);

        // Vérifier que l'owner a bien ce service
        $hasService = $user->ownerServices()
            ->where('service_type', $data['service_type'])
            ->where('is_active', true)
            ->exists();

        if (!$hasService) {
            return response()->json([
                'message' => "Vous ne proposez pas le service \"{$data['service_type']}\"."
            ], 422);
        }

        // Éviter les doublons pending
        $alreadyPending = ServiceCustomization::where('owner_id', $user->id)
            ->where('service_type', $data['service_type'])
            ->where('customization_type', $data['customization_type'])
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            return response()->json([
                'message' => 'Vous avez déjà une demande en attente pour cette personnalisation.'
            ], 422);
        }

        $customization = ServiceCustomization::create([
            'owner_id'           => $user->id,
            'service_type'       => $data['service_type'],
            'customization_type' => $data['customization_type'],
            'details'            => array_merge(
                $data['details'] ?? [],
                ['description' => $data['description']]
            ),
            'status'             => 'pending',
            'payment_required'   => false,
            'payment_status'     => null,
        ]);

        return response()->json([
            'message'       => 'Demande envoyée avec succès. L\'admin vous répondra sous 48h.',
            'customization' => $this->formatCustomization($customization),
        ], 201);
    }

    /**
     * DELETE /api/owner/customizations/{id}
     * Owner annule sa demande (seulement si pending)
     */
    public function cancel(Request $request, int $id)
    {
        $user = $request->user();
        $c    = ServiceCustomization::where('owner_id', $user->id)->findOrFail($id);

        if ($c->status !== 'pending') {
            return response()->json(['message' => 'Impossible d\'annuler cette demande.'], 422);
        }

        $c->delete();
        return response()->json(['message' => 'Demande annulée.']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN ROUTES
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/customizations
     * Liste toutes les demandes (admin)
     */
    public function adminIndex(Request $request)
    {
        $status = $request->query('status'); // pending / approved / rejected / all

        $query = ServiceCustomization::with('owner')
            ->latest();

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $customizations = $query->get()->map(fn($c) => $this->formatCustomization($c, true));

        return response()->json($customizations);
    }

    /**
     * PATCH /api/admin/customizations/{id}
     * Admin approuve ou refuse une demande
     */
    public function adminUpdate(Request $request, int $id)
    {
        $data = $request->validate([
            'status'           => 'required|in:approved,rejected',
            'admin_notes'      => 'nullable|string|max:500',
            'payment_required' => 'nullable|boolean',
            'payment_amount'   => 'nullable|numeric|min:0',
        ]);

        $customization = ServiceCustomization::with('owner')->findOrFail($id);

        $customization->update([
            'status'           => $data['status'],
            'admin_notes'      => $data['admin_notes'] ?? null,
            'payment_required' => $data['payment_required'] ?? false,
            'payment_amount'   => $data['payment_required'] ? ($data['payment_amount'] ?? null) : null,
            'payment_status'   => $data['payment_required'] ? 'pending' : null,
        ]);

        // Si approuvé sans paiement → appliquer immédiatement
        if ($data['status'] === 'approved' && !($data['payment_required'] ?? false)) {
            $this->applyCustomization($customization);
        }

        // Notifier l'owner par email
        $this->notifyOwner($customization);

        return response()->json([
            'message'       => 'Décision enregistrée.',
            'customization' => $this->formatCustomization($customization->fresh('owner'), true),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS PRIVÉS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Applique la customisation sur owner_services ou OwnerAiFeature
     */
    private function applyCustomization(ServiceCustomization $c): void
    {
        try {
            $aiTypes = ['chatbot_indexing', 'demand_prediction', 'recommendations', 'dynamic_pricing'];

            if (in_array($c->customization_type, $aiTypes)) {
                // Activer la feature IA
                \App\Models\OwnerAiFeature::updateOrCreate(
                    ['owner_id' => $c->owner_id, 'feature_name' => $c->customization_type],
                    ['active' => true, 'activated_at' => now()]
                );
                Log::info("AI feature {$c->customization_type} activated for owner #{$c->owner_id}");
                return;
            }

            // Customisations service (zone, tarif, option)
            $ownerService = OwnerService::where('owner_id', $c->owner_id)
                ->where('service_type', $c->service_type)
                ->first();

            if (!$ownerService) return;

            $details = $c->details ?? [];

            match ($c->customization_type) {
                'zone_exclusive' => $ownerService->update([
                    'coverage_area' => $details['zone'] ?? $ownerService->coverage_area,
                ]),
                'tarif_special' => $ownerService->update([
                    'base_price' => $details['new_price'] ?? $ownerService->base_price,
                ]),
                'option_supplementaire' => $ownerService->update([
                    'description' => ($ownerService->description ?? '') . "\n" . ($details['option'] ?? ''),
                ]),
                default => null,
            };

            Log::info("Customization {$c->customization_type} applied for owner #{$c->owner_id}");
        } catch (\Exception $e) {
            Log::error("applyCustomization failed: " . $e->getMessage());
        }
    }

    /**
     * Envoyer un email de notification à l'owner
     */
    private function notifyOwner(ServiceCustomization $c): void
    {
        try {
            $owner  = $c->owner;
            $status = $c->status === 'approved' ? 'approuvée' : 'refusée';
            $label  = $this->getCustomizationLabel($c->customization_type);

            // Email simple via Laravel Mail façade
            \Illuminate\Support\Facades\Mail::raw(
                "Bonjour {$owner->name},\n\n" .
                    "Votre demande de personnalisation « {$label} » pour le service « {$c->service_type} » a été {$status}.\n\n" .
                    ($c->admin_notes ? "Note de l'admin : {$c->admin_notes}\n\n" : '') .
                    ($c->payment_required && $c->status === 'approved'
                        ? "Un paiement de {$c->payment_amount} MAD est requis pour finaliser.\n\n"
                        : '') .
                    "Connectez-vous à votre tableau de bord pour plus de détails.\n\nAutoRent",
                fn($message) => $message
                    ->to($owner->email)
                    ->subject("Demande de personnalisation {$status} — AutoRent")
            );
        } catch (\Exception $e) {
            Log::warning("notifyOwner email failed: " . $e->getMessage());
        }
    }

    private function getCustomizationLabel(string $type): string
    {
        return match ($type) {
            'chatbot_indexing'    => 'Indexation Chatbot IA',
            'demand_prediction'   => 'Prédiction de la demande',
            'recommendations'     => 'Recommandations intelligentes',
            'dynamic_pricing'     => 'Tarification dynamique',
            'zone_exclusive'      => 'Zone d\'intervention exclusive',
            'tarif_special'       => 'Tarif spécial',
            'option_supplementaire' => 'Option supplémentaire',
            default               => $type,
        };
    }

    private function formatCustomization(ServiceCustomization $c, bool $withOwner = false): array
    {
        $result = [
            'id'                 => $c->id,
            'service_type'       => $c->service_type,
            'customization_type' => $c->customization_type,
            'label'              => $this->getCustomizationLabel($c->customization_type),
            'details'            => $c->details,
            'description'        => $c->details['description'] ?? '',
            'status'             => $c->status,
            'admin_notes'        => $c->admin_notes,
            'payment_required'   => $c->payment_required,
            'payment_amount'     => $c->payment_amount,
            'payment_status'     => $c->payment_status,
            'created_at'         => $c->created_at?->format('d/m/Y H:i'),
        ];

        if ($withOwner && $c->relationLoaded('owner')) {
            $result['owner'] = [
                'id'    => $c->owner->id,
                'name'  => $c->owner->name,
                'email' => $c->owner->email,
            ];
        }

        return $result;
    }
}
