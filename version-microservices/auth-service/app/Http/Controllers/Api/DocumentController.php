<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    // ── GET /api/documents ────────────────────────────────────────────────
    public function index(Request $request)
    {
        $documents = $request->user()->documents()->get();
        return response()->json($documents);
    }

    // ── POST /api/documents/upload ────────────────────────────────────────
    public function upload(Request $request)
    {
        try {
            $request->validate([
                'document' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:10240',
                'doc_type' => 'required|in:cin,cin_verso,permis,permis_verso,carte_grise,carte_grise_verso',
            ]);

            $user    = $request->user();
            $docType = $request->doc_type;

            Log::info("Document upload start: user={$user->id}, type={$docType}");

            // ── 1. Sauvegarder le fichier localement ──────────────────────
            $file     = $request->file('document');
            $filename = "doc_{$user->id}_{$docType}_" . time() . '.' . $file->extension();
            $path     = $file->storeAs('documents', $filename, 'local');

            Log::info("File stored at: {$path}");

            // ── 2. Créer ou mettre à jour le document en BDD ──────────────
            $document = Document::updateOrCreate(
                ['user_id' => $user->id, 'type' => $docType],
                [
                    'file_path'          => $path,
                    'status'             => 'pending',
                    'extracted_data'     => null,
                    'verified_at'        => null,
                    'cross_validated_at' => null,
                ]
            );

            Log::info("Document record saved: id={$document->id}");

            // ── 3. Appeler le service OCR ──────────────────────────────────
            $extractedData = null;
            $ocrSuccess    = false;

            try {
                $ocrUrl = env('OCR_SERVICE_URL', 'http://ocr-service:8005');
                Log::info("Calling OCR at: {$ocrUrl}/ocr/extract");

                // Lire le contenu du fichier depuis le disque local
                $fileContent = Storage::disk('local')->get($path);

                if (!$fileContent) {
                    Log::error("Cannot read file from storage: {$path}");
                    throw new \Exception("File not readable from storage");
                }

                $ocrResponse = Http::timeout(120)
                    ->attach('file', $fileContent, $filename)
                    ->post("{$ocrUrl}/ocr/extract", [
                        'doc_type' => $docType,
                    ]);

                Log::info("OCR response status: " . $ocrResponse->status());

                if ($ocrResponse->successful()) {
                    $ocrResult     = $ocrResponse->json();
                    $ocrSuccess    = $ocrResult['success'] ?? false;
                    $extractedData = $ocrResult['data'] ?? null;

                    Log::info("OCR success: " . json_encode($extractedData));

                    // Mettre à jour le document avec les données extraites
                    if ($extractedData) {
                        $document->update(['extracted_data' => $extractedData]);

                        // Synchroniser dans le profil user
                        $this->syncUserFromOcr($user, $docType, $extractedData);

                        // Tenter la validation croisée
                        $this->attemptCrossValidation($user->id);
                    }
                } else {
                    Log::warning("OCR returned error: " . $ocrResponse->body());
                }

            } catch (\Exception $ocrEx) {
                Log::warning("OCR call failed (non-blocking): " . $ocrEx->getMessage());
                // L'upload réussit quand même même si l'OCR échoue
            }

            // ── 4. Recharger le document frais ────────────────────────────
            $document->refresh();

            return response()->json([
                'success'        => true,
                'document'       => [
                    'id'                 => $document->id,
                    'type'               => $document->type,
                    'status'             => $document->status,
                    'cross_validated_at' => $document->cross_validated_at,
                ],
                'extracted_data' => $extractedData,
                'ocr_success'    => $ocrSuccess,
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Document upload error: ' . $e->getMessage());
            Log::error('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de l\'upload: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ── DELETE /api/documents/{id} ────────────────────────────────────────
    public function destroy(Request $request, int $id)
    {
        $document = Document::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($document->file_path) {
            Storage::disk('local')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['success' => true]);
    }

    // ── Sync profil depuis OCR ─────────────────────────────────────────────
    private function syncUserFromOcr($user, string $docType, array $data): void
    {
        $updates = [];

        switch ($docType) {
            case 'cin':
                if (!empty($data['last_name']))       $updates['last_name']       = $data['last_name'];
                if (!empty($data['first_name']))       $updates['first_name']      = $data['first_name'];
                if (!empty($data['cin_number']))       $updates['cin_number']      = $data['cin_number'];
                if (!empty($data['cin_expiry_date']))  $updates['cin_expiry_date'] = $data['cin_expiry_date'];
                if (!empty($data['birth_date']))       $updates['date_of_birth']   = $data['birth_date'];
                break;

            case 'cin_verso':
                if (!empty($data['address'])) $updates['address'] = $data['address'];
                if (!empty($data['gender'])) {
                    $g = strtolower($data['gender']);
                    $updates['gender'] = in_array($g, ['m', 'masculin', 'male', 'ذكر'])
                        ? 'male' : 'female';
                }
                break;

            case 'permis':
            case 'permis_verso':
                if (!empty($data['permis_number']))   $updates['permis_number']    = $data['permis_number'];
                if (!empty($data['categories']))      $updates['permis_categories'] = is_array($data['categories'])
                    ? implode(',', $data['categories']) : $data['categories'];
                if (!empty($data['birth_date']))      $updates['permis_birth_date'] = $data['birth_date'];
                if (!empty($data['issue_date']))      $updates['permis_issue_date'] = $data['issue_date'];
                if (!empty($data['expiry_date']))     $updates['permis_expiry_date']= $data['expiry_date'];
                break;

            case 'carte_grise':
            case 'carte_grise_verso':
                // Pas de sync dans le profil user pour la carte grise
                // Les données sont retournées au frontend directement
                break;
        }

        if (!empty($updates)) {
            // Recalculer le name depuis first_name + last_name
            $fn = $updates['first_name'] ?? $user->first_name;
            $ln = $updates['last_name']  ?? $user->last_name;
            if ($fn || $ln) {
                $updates['name'] = trim("$fn $ln");
            }
            try {
                $user->update($updates);
                Log::info("User #{$user->id} profile synced from OCR ({$docType})");
            } catch (\Exception $e) {
                Log::error("syncUserFromOcr failed: " . $e->getMessage());
            }
        }
    }

    // ── Validation croisée CIN ↔ Permis ───────────────────────────────────
    private function attemptCrossValidation(int $userId): void
    {
        try {
            $cin    = Document::where('user_id', $userId)->where('type', 'cin')->first();
            $permis = Document::where('user_id', $userId)->where('type', 'permis')->first();

            if (!$cin || !$permis || !$cin->extracted_data || !$permis->extracted_data) {
                return;
            }

            $cinData    = is_array($cin->extracted_data)
                ? $cin->extracted_data
                : json_decode($cin->extracted_data, true);
            $permisData = is_array($permis->extracted_data)
                ? $permis->extracted_data
                : json_decode($permis->extracted_data, true);

            if (!$cinData || !$permisData) return;

            $normalize = fn($s) => preg_replace('/[^a-z0-9]/', '', strtolower($s ?? ''));

            $lastNameMatch  = $normalize($cinData['last_name']  ?? '') === $normalize($permisData['last_name']  ?? '');
            $firstNameMatch = $normalize($cinData['first_name'] ?? '') === $normalize($permisData['first_name'] ?? '');
            $birthMatch     = $normalize($cinData['birth_date'] ?? '') === $normalize($permisData['birth_date'] ?? '');

            if ($lastNameMatch && $firstNameMatch && $birthMatch) {
                $now = now();
                $cin->update(['cross_validated_at'    => $now]);
                $permis->update(['cross_validated_at' => $now]);
                Log::info("Cross-validation success for user #{$userId}");
            }
        } catch (\Exception $e) {
            Log::warning("Cross-validation failed: " . $e->getMessage());
        }
    }
}