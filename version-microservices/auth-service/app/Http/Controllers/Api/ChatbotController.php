<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\OwnerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    // ── Données JAMAIS divulguées au chatbot ──────────────────────────────
    private const BLOCKED_FIELDS = [
        'immatriculation',
        'chassis',
        'vin',
        'cin_number',
        'cin_expiry',
        'permis_number',
        'date_of_birth',
        'address',
        'password',
        'remember_token',
        'agency_rc',
    ];

    // ── Patterns regex à détecter dans les réponses ───────────────────────
    private const SENSITIVE_PATTERNS = [
        '/\b[A-Z]{1,2}[0-9]{5,6}\b/',           // CIN marocain
        '/\b[0-9]{2}-[A-Z]-[0-9]{4,5}\b/',       // Immatriculation neuve
        '/\b[A-Z]{2}[0-9]{5,6}\b/',              // Immatriculation ancienne
        '/\b[A-Z0-9]{17}\b/',                     // VIN 17 caractères
        '/\+212[0-9\s]{8,12}/',                   // Téléphone marocain
        '/\b0[67][0-9]{8}\b/',                    // Mobile maroc
        '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', // Email
    ];

    // ── POST /api/chatbot/message ─────────────────────────────────────────
    public function message(Request $request)
    {
        try {
            $request->validate([
                'message' => 'required|string|max:500',
                'history' => 'nullable|array|max:20',
                'history.*.role' => 'in:user,assistant',
                'history.*.content' => 'string|max:1000',
                'context' => 'nullable|array',  // ← ajouter

            ]);

            $userMessage = trim($request->message);
            $history     = $request->input('history', []);
            $pageContext  = $request->input('context', ['page' => 'general']); // ← récupérer

            // Construire le contexte des owners indexés
            $context = $this->buildContext($pageContext);  // ← passer le contexte

            // Construire les messages pour Groq
            $messages = $this->buildMessages($context, $history, $userMessage);

            // Appeler Groq API
            $groqResponse = $this->callGroq($messages);

            if (!$groqResponse) {
                return response()->json([
                    'response' => "Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.",
                    'suggestions' => [],
                ]);
            }

            // Filtrer les données sensibles de la réponse
            $filteredResponse = $this->filterSensitiveData($groqResponse);

            // Extraire des suggestions de liens
            $suggestions = $this->extractSuggestions($filteredResponse, $context);

            return response()->json([
                'response'    => $filteredResponse,
                'suggestions' => $suggestions,
            ]);
        } catch (\Exception $e) {
            Log::error('Chatbot error: ' . $e->getMessage());
            return response()->json([
                'response' => "Une erreur s'est produite. Veuillez réessayer.",
                'suggestions' => [],
            ], 500);
        }
    }

    // ── Construire le contexte des véhicules/owners indexés ──────────────
    private function buildContext(array $pageContext = []): string
    {
        $page      = $pageContext['page']      ?? 'general';
        $ownerId   = $pageContext['ownerId']   ?? null;
        $vehiculeId = $pageContext['vehiculeId'] ?? null;
        $serviceType = $pageContext['serviceType'] ?? null;

        try {
            // ── Page d'un owner spécifique ────────────────────────────────
            if ($page === 'owner' && $ownerId) {
                return $this->buildOwnerContext((int) $ownerId);
            }

            // ── Page d'un véhicule spécifique ─────────────────────────────
            if ($page === 'vehicule' && $vehiculeId) {
                return $this->buildVehiculeContext((int) $vehiculeId);
            }

            // ── Page d'un service (bagages/livraison/déménagement) ────────
            if (in_array($page, ['bagages', 'livraison', 'demenagement']) || $serviceType) {
                $type = $serviceType ?? match ($page) {
                    'bagages'      => 'transport_bagages',
                    'livraison'    => 'livraison_colis',
                    'demenagement' => 'demenagement',
                    default        => null,
                };
                return $this->buildServiceContext($type);
            }

            // ── Page générale ─────────────────────────────────────────────
            return $this->buildGeneralContext();
        } catch (\Exception $e) {
            Log::warning('buildContext error: ' . $e->getMessage());
            return "Contexte temporairement indisponible.";
        }
    }

    // ── Contexte : véhicules d'un owner spécifique ───────────────────────
    private function buildOwnerContext(int $ownerId): string
    {
        $owner = User::with(['ownerServices'])->find($ownerId);
        if (!$owner) return "Propriétaire introuvable.";

        $displayName = ($owner->is_agency && $owner->agency_name)
            ? $owner->agency_name : $owner->name;

        $vehiculesRes = Http::timeout(5)->get(
            env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . '/api/vehicules'
        );

        $vehicules = $vehiculesRes->successful()
            ? collect($vehiculesRes->json())->where('user_id', $ownerId)
            : collect();

        $lines = ["=== PROPRIÉTAIRE : {$displayName} ==="];
        if ($owner->bio) $lines[] = "Description: " . $owner->bio;
        if ($owner->city) $lines[] = "Ville: " . $owner->city;

        if ($vehicules->isNotEmpty()) {
            $lines[] = "\n=== SES VÉHICULES DISPONIBLES ===";
            foreach ($vehicules as $v) {
                $lines[] = sprintf(
                    "- %s %s (%s) | %s | %s | %s places | %s MAD/jour | ID:%s",
                    $v['brand'],
                    $v['model'],
                    $v['year'] ?? 'N/A',
                    $v['fuel_type'] ?? 'N/A',
                    $v['transmission'] ?? 'N/A',
                    $v['seats'] ?? 'N/A',
                    $v['price_per_day'],
                    $v['id']
                );
            }
        } else {
            $lines[] = "Aucun véhicule disponible pour ce propriétaire.";
        }

        return implode("\n", $lines);
    }

    // ── Contexte : un véhicule spécifique ────────────────────────────────
    private function buildVehiculeContext(int $vehiculeId): string
    {
        $res = Http::timeout(5)->get(
            env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . "/api/vehicules/{$vehiculeId}"
        );

        if (!$res->successful()) return "Véhicule introuvable.";
        $v = $res->json();

        $lines = [
            "=== VÉHICULE CONSULTÉ ===",
            "Marque/Modèle: {$v['brand']} {$v['model']}",
            "Année: " . ($v['year'] ?? 'N/A'),
            "Carburant: " . ($v['fuel_type'] ?? 'N/A'),
            "Transmission: " . ($v['transmission'] ?? 'N/A'),
            "Places: " . ($v['seats'] ?? 'N/A'),
            "Prix: {$v['price_per_day']} MAD/jour",
            "Ville: " . ($v['city'] ?? 'Non précisée'),
            "Statut: " . ($v['status'] === 'available' ? 'Disponible' : 'Indisponible'),
        ];

        if (!empty($v['description'])) {
            $lines[] = "Description: " . substr($v['description'], 0, 200);
        }

        if (!empty($v['offers_driver']) && $v['offers_driver']) {
            $lines[] = "Chauffeur: Disponible à " . ($v['driver_daily_rate'] ?? '?') . " MAD/jour";
        }

        $lines[] = "ID:" . $v['id'];

        return implode("\n", $lines);
    }

    // ── Contexte : prestataires d'un service ─────────────────────────────
    private function buildServiceContext(?string $serviceType): string
    {
        $owners = User::with(['ownerServices'])
            ->whereHas('role', fn($q) => $q->where('name', 'owner'))
            ->whereHas('ownerServices', function ($q) use ($serviceType) {
                $q->where('is_active', true);
                if ($serviceType) $q->where('service_type', $serviceType);
            })
            ->get();

        $serviceLabel = match ($serviceType) {
            'transport_bagages' => 'Transport de bagages',
            'livraison_colis'   => 'Livraison de colis',
            'demenagement'      => 'Déménagement',
            default             => 'Services de transport',
        };

        $lines = ["=== PRESTATAIRES : {$serviceLabel} ==="];

        foreach ($owners as $owner) {
            $name = ($owner->is_agency && $owner->agency_name)
                ? $owner->agency_name : $owner->name;

            $line = "- {$name} | Ville: " . ($owner->city ?? 'N/A');
            if ($owner->bio) $line .= " | " . substr($owner->bio, 0, 80);

            $service = $owner->ownerServices
                ->where('service_type', $serviceType)
                ->first();
            if ($service?->base_price) $line .= " | À partir de: {$service->base_price} MAD";
            if ($service?->coverage_area) $line .= " | Zone: {$service->coverage_area}";
            $line .= " | ID:{$owner->id}";

            $lines[] = $line;
        }

        if (count($lines) === 1) {
            $lines[] = "Aucun prestataire disponible pour ce service.";
        }

        return implode("\n", $lines);
    }

    // ── Contexte général (page d'accueil / vehicules) ────────────────────
    private function buildGeneralContext(): string
    {
        // Récupérer les véhicules indexés (owners avec chatbot_indexing)
        $indexedOwnerIds = User::whereHas('ownerAiFeatures', function ($q) {
            $q->whereHas('feature', fn($f) => $f->where('feature_name', 'chatbot_indexing'))
                ->where('active', true);
        })->pluck('id')->toArray();

        $vehiculesRes = Http::timeout(5)->get(
            env('VEHICLE_SERVICE_URL', 'http://vehicle-service') . '/api/vehicules'
        );

        $vehicules = $vehiculesRes->successful()
            ? collect($vehiculesRes->json())
            ->when(!empty($indexedOwnerIds), fn($c) => $c->whereIn('user_id', $indexedOwnerIds))
            : collect();

        $lines = ["=== APERÇU DE LA PLATEFORME ==="];

        if ($vehicules->isNotEmpty()) {
            $lines[] = "\n--- Quelques véhicules disponibles ---";
            foreach ($vehicules->take(15) as $v) {
                $lines[] = sprintf(
                    "- %s %s | %s | %s MAD/jour | %s | ID:%s",
                    $v['brand'],
                    $v['model'],
                    $v['city'] ?? 'N/A',
                    $v['price_per_day'],
                    $v['fuel_type'] ?? 'N/A',
                    $v['id']
                );
            }
        }

        // Services disponibles
        $serviceOwners = User::with('ownerServices')
            ->whereHas('role', fn($q) => $q->where('name', 'owner'))
            ->whereHas('ownerServices', fn($q) => $q->where('is_active', true)
                ->whereIn('service_type', ['transport_bagages', 'livraison_colis', 'demenagement']))
            ->count();

        if ($serviceOwners > 0) {
            $lines[] = "\n--- Services de transport ---";
            $lines[] = "{$serviceOwners} prestataire(s) disponibles pour : transport bagages, livraison colis, déménagement";
        }

        return implode("\n", $lines);
    }

    // ── Construire les messages pour Groq ─────────────────────────────────
    private function buildMessages(string $context, array $history, string $userMessage): array
    {
        $systemPrompt = <<<PROMPT
Tu es l'assistant virtuel de la plateforme AutoRent Maroc, une plateforme de location de véhicules et services de transport.

## TON RÔLE
Aider les clients à :
- Trouver le véhicule ou service adapté à leurs besoins
- Comprendre les disponibilités et tarifs généraux
- Naviguer sur la plateforme

## DONNÉES DISPONIBLES (contexte actuel)
{$context}

## RÈGLES ABSOLUES — NE JAMAIS VIOLER

### DONNÉES INTERDITES — ne jamais mentionner :
- Numéros d'immatriculation des véhicules
- Numéros de châssis (VIN)
- Numéros CIN ou permis de conduire
- Adresses email directes des propriétaires
- Numéros de téléphone directs
- Dates de naissance
- Adresses personnelles
- Données de réservations d'autres clients
- Historique de transactions

### DONNÉES AUTORISÉES — tu peux partager :
- Marque, modèle, année du véhicule
- Prix par jour
- Carburant, transmission, nombre de places
- Ville de localisation
- Description générale
- Note moyenne et nombre d'avis (si disponible)
- Disponibilité générale (oui/non)
- Type de services proposés par un prestataire
- Nom commercial ou d'agence

### COMPORTEMENT
- Réponds TOUJOURS en français
- Sois concis mais chaleureux (max 3-4 phrases par réponse)
- Si tu ne sais pas → dis-le honnêtement, ne fabrique pas de données
- Ne donne JAMAIS de conseils médicaux, juridiques ou financiers
- Si demande hors sujet → redirige poliment vers la plateforme
- Pour contacter un propriétaire → invite l'utilisateur à utiliser le formulaire de contact sur la page du véhicule
- Ne fais JAMAIS de réservation toi-même → dirige vers la page du véhicule

### FORMAT DE RÉPONSE
- Réponse courte et directe
- Si tu proposes un véhicule, utilise le format : "**Marque Modèle** (Ville) - X MAD/jour"
- Termine parfois par une question pour mieux cerner les besoins

Tu es un assistant utile, professionnel et bienveillant.
PROMPT;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        // Ajouter l'historique (max 10 échanges)
        foreach (array_slice($history, -10) as $h) {
            if (isset($h['role'], $h['content'])) {
                $messages[] = [
                    'role'    => $h['role'],
                    'content' => substr($h['content'], 0, 1000),
                ];
            }
        }

        // Message actuel
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        return $messages;
    }

    // ── Appeler Groq API ──────────────────────────────────────────────────
    private function callGroq(array $messages): ?string
    {
        $apiKey = env('GROQ_API_KEY');
        $model  = env('GROQ_MODEL', 'llama-3.3-70b-versatile');

        if (!$apiKey) {
            Log::error('GROQ_API_KEY not set');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])->timeout(15)->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => $model,
                'messages'    => $messages,
                'max_tokens'  => 300,
                'temperature' => 0.4,
            ]);

            if (!$response->successful()) {
                Log::error('Groq API error: ' . $response->body());
                return null;
            }

            return $response->json('choices.0.message.content');
        } catch (\Exception $e) {
            Log::error('Groq call failed: ' . $e->getMessage());
            return null;
        }
    }

    // ── Filtrer les données sensibles de la réponse ───────────────────────
    private function filterSensitiveData(string $response): string
    {
        foreach (self::SENSITIVE_PATTERNS as $pattern) {
            $response = preg_replace($pattern, '[information confidentielle]', $response);
        }

        // Vérifier si des mots-clés sensibles apparaissent
        $blockedKeywords = [
            'immatriculation',
            'matricule',
            'carte grise',
            'VIN',
            'châssis',
            'CIN',
            'cin_number',
            'permis n°',
            'téléphone direct',
        ];

        foreach ($blockedKeywords as $keyword) {
            if (stripos($response, $keyword) !== false) {
                // Log pour monitoring mais ne pas bloquer la réponse entière
                Log::warning("Chatbot: potential sensitive keyword detected: {$keyword}");
            }
        }

        return $response;
    }

    // ── Extraire des suggestions de liens depuis la réponse ───────────────
    private function extractSuggestions(string $response, string $context): array
    {
        $suggestions = [];

        // Chercher des IDs de véhicules mentionnés dans le contexte
        preg_match_all('/ID:(\d+)/', $context, $matches);
        $vehiculeIds = $matches[1] ?? [];

        // Si la réponse mentionne des marques, suggérer les liens véhicules
        $brands = [
            'dacia',
            'renault',
            'volkswagen',
            'toyota',
            'hyundai',
            'kia',
            'ford',
            'peugeot',
            'citroën',
            'fiat',
            'mercedes',
            'bmw',
            'audi',
            'opel',
            'seat',
            'honda',
            'suzuki'
        ];

        foreach ($brands as $brand) {
            if (stripos($response, $brand) !== false && !empty($vehiculeIds)) {
                $suggestions[] = [
                    'label' => "Voir les véhicules",
                    'url'   => '/vehicules',
                    'type'  => 'vehicules',
                ];
                break;
            }
        }

        // Suggestions basées sur les services mentionnés
        $serviceMap = [
            'bagage'      => ['label' => 'Transport de bagages', 'url' => '/bagages',    'type' => 'service'],
            'livraison'   => ['label' => 'Livraison de colis',   'url' => '/livraison',  'type' => 'service'],
            'déménagement' => ['label' => 'Déménagement',          'url' => '/demenagement', 'type' => 'service'],
            'location'    => ['label' => 'Location de véhicules', 'url' => '/vehicules', 'type' => 'vehicules'],
        ];

        foreach ($serviceMap as $keyword => $suggestion) {
            if (stripos($response, $keyword) !== false) {
                $already = array_column($suggestions, 'url');
                if (!in_array($suggestion['url'], $already)) {
                    $suggestions[] = $suggestion;
                }
            }
        }

        return array_slice($suggestions, 0, 3);
    }
}
