<?php
// booking-service/app/Services/ContractService.php

namespace App\Services;

use App\Models\Booking;
use App\Models\Contract;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ContractService
{
    /**
     * Génère le contrat PDF pour un booking approuvé.
     * Appelé depuis BookingController::updateStatus() quand status → approved
     */
    public function generateForBooking(Booking $booking): ?Contract
    {
        try {
            // 1. Éviter les doublons
            if ($booking->contract()->exists()) {
                Log::info("Contract already exists for booking #{$booking->id}");
                return $booking->contract;
            }

            // 2. Récupérer le véhicule via HTTP
            $vehicleData = $this->fetchVehicle($booking->vehicule_id);
            if (!$vehicleData) {
                Log::error("Vehicle not found for booking #{$booking->id}, vehicule_id: {$booking->vehicule_id}");
                return null;
            }

            // 3. Récupérer le client via HTTP
            $clientData = $this->fetchClient($booking->user_id);
            // 4. Récupérer le propriétaire via HTTP (user_id du véhicule)
            $ownerId = $vehicleData['user_id'] ?? null;
            $ownerData = $ownerId ? $this->fetchOwner($ownerId) : [];

            // 🔥 Extraire et encoder le logo en base64 via HTTP
            $agencyLogoBase64 = null;
            if (!empty($ownerData['agency_logo'])) {
                $logoUrl = $ownerData['agency_logo'];

                // Remplacer l'URL publique par l'URL interne Docker
                if (str_contains($logoUrl, 'http://localhost')) {
                    $logoUrl = str_replace('http://localhost', 'http://auth-service', $logoUrl);
                }

                try {
                    $response = Http::timeout(5)->get($logoUrl);
                    if ($response->successful()) {
                        $imageContent = $response->body();
                        $mimeType = $response->header('Content-Type') ?? 'image/jpeg';
                        $agencyLogoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
                        Log::info("Logo fetched successfully from: {$logoUrl}");
                    } else {
                        Log::warning("Could not fetch logo: {$logoUrl}, status: " . $response->status());
                    }
                } catch (\Exception $e) {
                    Log::warning("Error fetching logo: " . $e->getMessage());
                }
            }



            // 5. Calculer les données du contrat
            $startDate = \Carbon\Carbon::parse($booking->start_date);
            $endDate   = \Carbon\Carbon::parse($booking->end_date);
            $nbDays    = $startDate->diffInDays($endDate);
            $vehiclePrice = $nbDays * ($vehicleData['price_per_day'] ?? 0);
            $driverPrice  = $booking->with_driver
                ? ($booking->nb_drivers * ($booking->driver_price_per_day ?? 0) * $nbDays)
                : 0;

            // 6. Données passées à la vue Blade
            $data = [
                'contract_number' => $this->generateContractNumber(),
                'generated_at'    => now()->format('d/m/Y à H:i'),
                'booking_id'      => $booking->id,

                // Client
                'client_name'     => $clientData['name']  ?? 'Client',
                'client_email'    => $clientData['email'] ?? '',
                'client_phone'    => $clientData['phone'] ?? '',
                'client_city'     => $clientData['city']  ?? '',
                'client_address'  => $clientData['address'] ?? '',

                // Owner / Agence
                'owner_name'      => $ownerData['agency_name'] ?? $ownerData['name'] ?? 'Propriétaire',
                'owner_email'     => $ownerData['email'] ?? '',
                'owner_phone'     => $ownerData['agency_phone'] ?? $ownerData['phone'] ?? '',
                'is_agency'       => $ownerData['is_agency'] ?? false,
                'agency_name'     => $ownerData['agency_name'] ?? null,
                'agency_rc'       => $ownerData['agency_rc']   ?? null,
                'agency_logo'     => $ownerData['agency_logo'] ?? null,
                'agency_logo_base64' => $agencyLogoBase64,  // ← Ajouter cette ligne

                // Véhicule
                'vehicle_brand'          => $vehicleData['brand'] ?? '',
                'vehicle_model'          => $vehicleData['model'] ?? '',
                'vehicle_year'           => $vehicleData['year'] ?? '',
                'vehicle_category'       => $vehicleData['category'] ?? '',
                'vehicle_fuel'           => $vehicleData['fuel_type'] ?? '',
                'vehicle_transmission'   => $vehicleData['transmission'] ?? '',
                'vehicle_immatriculation' => $vehicleData['immatriculation'] ?? 'Non renseignée',
                'vehicle_city'           => $vehicleData['city'] ?? '',

                // Réservation
                'start_date'      => $startDate->format('d/m/Y'),
                'end_date'        => $endDate->format('d/m/Y'),
                'nb_days'         => $nbDays,
                'price_per_day'   => $vehicleData['price_per_day'] ?? 0,
                'vehicle_price'   => $vehiclePrice,

                // Chauffeur
                'with_driver'          => $booking->with_driver ?? false,
                'nb_drivers'           => $booking->nb_drivers ?? 0,
                'driver_price_per_day' => $booking->driver_price_per_day ?? 0,
                'driver_price_total'   => $driverPrice,

                // Prix total
                'total_price'     => $booking->total_price,
            ];

            // 7. Générer le PDF
            $pdf = Pdf::loadView('contracts.location', $data)
                ->setPaper('a4', 'portrait')
                ->setOptions([
                    'defaultFont'   => 'DejaVu Sans',
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled'      => false,
                ]);

            // 8. Sauvegarder le PDF
            $filename = "contracts/CTR-{$booking->id}-" . time() . ".pdf";
            Storage::disk('local')->put($filename, $pdf->output());

            // 9. Créer l'entrée en BDD
            $contract = Contract::create([
                'booking_id'      => $booking->id,
                'contract_number' => $data['contract_number'],
                'status'          => 'sent',
                'pdf_path'        => $filename,
            ]);

            Log::info("Contract #{$contract->contract_number} generated for booking #{$booking->id}");
            return $contract;
        } catch (\Exception $e) {
            Log::error("Contract generation failed for booking #{$booking->id}: " . $e->getMessage());
            return null;
        }
    }

    // Méthode pour générer le numéro de contrat
    private function generateContractNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastContract = Contract::orderBy('id', 'desc')->first();
        $nextId = $lastContract ? $lastContract->id + 1 : 1;
        return "CTR-{$year}{$month}-" . str_pad($nextId, 4, '0', STR_PAD_LEFT);
    }

    // Corriger fetchOwner (sans paramètre bookingId inutile)
    private function fetchOwner(int $ownerId): array
    {
        if (!$ownerId) return [];
        try {
            $res = Http::timeout(5)->get(env('AUTH_SERVICE_URL', 'http://auth-service') . "/api/users/{$ownerId}");
            return $res->successful() ? $res->json() : [];
        } catch (\Exception $e) {
            Log::warning("fetchOwner error: " . $e->getMessage());
            return [];
        }
    }
    // ── Helpers HTTP ──────────────────────────────────────────────────────────

    private function fetchClient(int $clientId): array
    {
        try {
            $res = Http::timeout(5)->get(env('AUTH_SERVICE_URL') . "/api/users/{$clientId}");
            return $res->successful() ? $res->json() : [];
        } catch (\Exception $e) {
            return [];
        }
    }



    private function fetchVehicle(int $vehicleId): array
    {
        try {
            $res = Http::timeout(5)->get(env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules/{$vehicleId}");
            return $res->successful() ? $res->json() : [];
        } catch (\Exception $e) {
            return [];
        }
    }
}
