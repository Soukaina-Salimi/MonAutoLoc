<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocialAuthController extends Controller
{
    // ── Une seule app Meta pour toute la plateforme ───────────────────────
    private function appId(): string
    {
        return env('META_APP_ID');
    }

    private function appSecret(): string
    {
        return env('META_APP_SECRET');
    }

    private function redirectUri(): string
    {
        return env('APP_URL') . '/api/social/facebook/callback';
    }

    // ── Étape 1 : Générer l'URL OAuth pour CET owner ─────────────────────
    // GET /api/social/facebook/connect
    public function facebookConnect(Request $request)
    {
        $owner = $request->user();

        // State contient l'ID de CET owner spécifique
        $state = base64_encode(json_encode([
            'owner_id'  => $owner->id,
            'timestamp' => time(),
        ]));

        // Stocker en cache pour vérification (5 minutes)
        cache()->put("fb_oauth_state_{$owner->id}", $state, 300);

        $url = "https://www.facebook.com/v19.0/dialog/oauth?" . http_build_query([
            'client_id'     => $this->appId(),
            'redirect_uri'  => $this->redirectUri(),
            'scope'         => implode(',', [
                'pages_manage_posts',
                'pages_read_engagement',
                'pages_show_list',
                'instagram_basic',
                'instagram_content_publish',
            ]),
            'state'         => $state,
            'response_type' => 'code',
        ]);

        return response()->json(['url' => $url]);
    }

    // ── Étape 2 : Callback — Facebook retourne le code ───────────────────
    // GET /api/social/facebook/callback
    public function facebookCallback(Request $request)
    {
        $code  = $request->query('code');
        $state = $request->query('state');
        $error = $request->query('error');

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');

        // Owner a refusé
        if ($error) {
            return redirect("{$frontendUrl}/owner/settings?social=denied");
        }

        // Décoder le state pour identifier CET owner
        $stateData = json_decode(base64_decode($state), true);
        $ownerId   = $stateData['owner_id'] ?? null;

        if (!$ownerId) {
            return redirect("{$frontendUrl}/owner/settings?social=error&reason=invalid_state");
        }

        // Vérifier le state anti-CSRF
        $storedState = cache("fb_oauth_state_{$ownerId}");
        if ($state !== $storedState) {
            return redirect("{$frontendUrl}/owner/settings?social=error&reason=csrf");
        }

        try {
            // ── 1. Échanger le code contre un short-lived token ───────────
            $tokenResp = Http::get('https://graph.facebook.com/v19.0/oauth/access_token', [
                'client_id'     => $this->appId(),
                'client_secret' => $this->appSecret(),
                'redirect_uri'  => $this->redirectUri(),
                'code'          => $code,
            ]);

            if (!$tokenResp->successful()) {
                Log::error("FB token exchange failed for owner {$ownerId}: " . $tokenResp->body());
                return redirect("{$frontendUrl}/owner/settings?social=error");
            }

            $shortToken = $tokenResp->json()['access_token'];

            // ── 2. Convertir en long-lived token (60 jours) ───────────────
            $longResp = Http::get('https://graph.facebook.com/v19.0/oauth/access_token', [
                'grant_type'        => 'fb_exchange_token',
                'client_id'         => $this->appId(),
                'client_secret'     => $this->appSecret(),
                'fb_exchange_token' => $shortToken,
            ]);

            $longToken = $longResp->json()['access_token'];
            $expiresIn = $longResp->json()['expires_in'] ?? 5184000;

            // ── 3. Récupérer les pages Facebook de CET owner ─────────────
            $pagesResp = Http::withToken($longToken)
                ->get('https://graph.facebook.com/v19.0/me/accounts');

            $pages = $pagesResp->json()['data'] ?? [];

            if (empty($pages)) {
                return redirect("{$frontendUrl}/owner/settings?social=no_pages");
            }

            // ── 4. Stocker le token de CHAQUE PAGE de cet owner ──────────
            // Note: le page_access_token est différent du user token
            // et n'expire PAS (tant que l'owner ne révoque pas l'accès)
            foreach ($pages as $page) {
                $pageToken = $page['access_token']; // Token permanent de la page
                $pageId    = $page['id'];
                $pageName  = $page['name'];

                // Stocker le token Facebook de CET owner pour CETTE page
                SocialAccount::updateOrCreate(
                    [
                        'user_id'  => $ownerId,
                        'platform' => 'facebook',
                    ],
                    [
                        'page_access_token' => $pageToken, // Chiffré par le mutateur
                        'page_id'           => $pageId,
                        'page_name'         => $pageName,
                        'is_active'         => true,
                        'token_expires_at'  => null, // Page tokens n'expirent pas
                        'last_used_at'      => now(),
                    ]
                );

                Log::info("Facebook connected for owner {$ownerId}: page '{$pageName}' (ID: {$pageId})");

                // ── 5. Vérifier si cette page a Instagram Business lié ────
                $igResp = Http::withToken($pageToken)
                    ->get("https://graph.facebook.com/v19.0/{$pageId}", [
                        'fields' => 'instagram_business_account',
                    ]);

                $igData   = $igResp->json();
                $igUserId = $igData['instagram_business_account']['id'] ?? null;

                if ($igUserId) {
                    // Stocker aussi le compte Instagram de CET owner
                    SocialAccount::updateOrCreate(
                        [
                            'user_id'  => $ownerId,
                            'platform' => 'instagram',
                        ],
                        [
                            'page_access_token' => $pageToken, // Même token Meta
                            'ig_user_id'        => $igUserId,
                            'page_name'         => $pageName,
                            'is_active'         => true,
                            'token_expires_at'  => null,
                        ]
                    );

                    Log::info("Instagram connected for owner {$ownerId}: IG ID {$igUserId}");
                }
            }

            // Nettoyer le state du cache
            cache()->forget("fb_oauth_state_{$ownerId}");

            return redirect("{$frontendUrl}/owner/settings?social=connected&platform=facebook");
        } catch (\Exception $e) {
            Log::error("Facebook OAuth error for owner {$ownerId}: " . $e->getMessage());
            return redirect("{$frontendUrl}/owner/settings?social=error");
        }
    }

    // ── Vérifier le statut des comptes d'un owner ─────────────────────────
    // GET /api/social/status
    public function status(Request $request)
    {
        $owner    = $request->user();
        $accounts = SocialAccount::where('user_id', $owner->id)
            ->where('is_active', true)
            ->get();

        $result = [];
        foreach ($accounts as $account) {
            $result[$account->platform] = [
                'connected' => true,
                'page_name' => $account->page_name,
                'page_id'   => $account->page_id,
                'ig_user_id' => $account->ig_user_id,
                'expired'   => $account->token_expires_at?->isPast() ?? false,
            ];
        }

        // Plateformes non connectées
        foreach (['facebook', 'instagram', 'tiktok'] as $platform) {
            if (!isset($result[$platform])) {
                $result[$platform] = ['connected' => false];
            }
        }

        return response()->json($result);
    }

    // ── Déconnecter un compte social d'un owner ───────────────────────────
    // DELETE /api/social/{platform}/disconnect
    public function disconnect(Request $request, string $platform)
    {
        $owner   = $request->user();
        $account = SocialAccount::where('user_id', $owner->id)
            ->where('platform', $platform)
            ->first();

        if ($account) {
            // Révoquer l'accès côté Meta
            if ($account->decrypted_token) {
                try {
                    Http::delete(
                        "https://graph.facebook.com/v19.0/me/permissions",
                        ['access_token' => $account->decrypted_token]
                    );
                } catch (\Exception $e) {
                    Log::warning("Token revoke failed: " . $e->getMessage());
                }
            }
            $account->delete();
        }

        return response()->json(['success' => true]);
    }
}
