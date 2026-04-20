<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
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

    private function getVehiculeOwnerId(int $vehiculeId): ?int
    {
        try {
            $res = Http::timeout(5)->get(
                env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules/{$vehiculeId}"
            );
            return $res->successful() ? ($res->json()['user_id'] ?? null) : null;
        } catch (\Exception $e) {
            Log::warning('getVehiculeOwnerId error: ' . $e->getMessage());
            return null;
        }
    }

    // ── GET /api/bookings/{id}/contract ───────────────────────────────────
    public function downloadByBooking(Request $request, int $bookingId)
    {
        $user = $this->getAuthUser($request);
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $booking = Booking::with('contract')->findOrFail($bookingId);

        $ownerId  = $this->getVehiculeOwnerId($booking->vehicule_id);
        $isClient = $booking->user_id === $user->id;
        $isOwner  = $ownerId === $user->id;

        if (!$isClient && !$isOwner) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        // Générer si absent
        if (!$booking->contract && in_array($booking->status, ['approved', 'completed'])) {
            $contract = (new ContractService())->generateForBooking($booking);
            if (!$contract) {
                return response()->json(['message' => 'Impossible de générer le contrat.'], 500);
            }
            $booking->refresh();
        }

        $contract = $booking->contract;

        if (!$contract) {
            return response()->json([
                'message' => 'Contrat non disponible. Il est généré après approbation.',
            ], 404);
        }

        // Regénérer si PDF manquant
        if (!$contract->pdf_path || !Storage::disk('local')->exists($contract->pdf_path)) {
            Log::warning("PDF missing for contract #{$contract->id}, regenerating...");
            $contract = (new ContractService())->generateForBooking($booking->fresh());
            if (!$contract) {
                return response()->json(['message' => 'Fichier PDF introuvable.'], 404);
            }
        }

        $pdfContent = Storage::disk('local')->get($contract->pdf_path);

        return response()->streamDownload(function () use ($pdfContent) {
            echo $pdfContent;
        }, $contract->contract_number . '.pdf', [
            'Content-Type'  => 'application/pdf',
            'Cache-Control' => 'no-cache',
        ]);
    }

    // ── GET /api/contracts/{id}/info ──────────────────────────────────────
    public function info(Request $request, int $contractId)
    {
        $user     = $this->getAuthUser($request);
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $contract = Contract::with('booking')->findOrFail($contractId);
        $booking  = $contract->booking;

        $ownerId  = $this->getVehiculeOwnerId($booking->vehicule_id);
        $isClient = $booking->user_id === $user->id;
        $isOwner  = $ownerId === $user->id;

        if (!$isClient && !$isOwner) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return response()->json([
            'id'              => $contract->id,
            'contract_number' => $contract->contract_number,
            'status'          => $contract->status,
            'has_pdf'         => !empty($contract->pdf_path)
                && Storage::disk('local')->exists($contract->pdf_path),
            'created_at'      => $contract->created_at->format('d/m/Y H:i'),
            'booking_id'      => $booking->id,
        ]);
    }
}