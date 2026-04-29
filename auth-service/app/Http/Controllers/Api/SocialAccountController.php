<?php
// auth-service/app/Http/Controllers/Api/SocialAccountController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocialAccountController extends Controller
{
    // ── GET /api/social-accounts ─────────────────────────────────────────
    public function index(Request $request)
    {
        $accounts = SocialAccount::where('user_id', $request->user()->id)
            ->get()
            ->map(fn($a) => $this->formatAccount($a));

        return response()->json($accounts);
    }

    // ── POST /api/social-accounts ─────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'platform'           => 'required|in:facebook,instagram,tiktok',
            'page_access_token'  => 'required|string',
            'page_id'            => 'nullable|string',
            'page_name'          => 'nullable|string|max:150',
            'ig_user_id'         => 'nullable|string',
            'tiktok_open_id'     => 'nullable|string',
        ]);

        // Vérifier le token Facebook/Instagram avant de sauvegarder
        if (in_array($request->platform, ['facebook', 'instagram'])) {
            $valid = $this->verifyFacebookToken($request->page_access_token);
            if (!$valid['valid']) {
                return response()->json([
                    'message' => 'Token invalide : ' . $valid['error'],
                ], 422);
            }
        }

        $account = SocialAccount::updateOrCreate(
            ['user_id' => $request->user()->id, 'platform' => $request->platform],
            [
                'page_access_token' => $request->page_access_token,
                'page_id'           => $request->page_id,
                'page_name'         => $request->page_name,
                'ig_user_id'        => $request->ig_user_id,
                'tiktok_open_id'    => $request->tiktok_open_id,
                'is_active'         => true,
            ]
        );

        return response()->json([
            'success' => true,
            'account' => $this->formatAccount($account),
        ]);
    }

    // ── DELETE /api/social-accounts/{platform} ────────────────────────────
    public function destroy(Request $request, string $platform)
    {
        SocialAccount::where('user_id', $request->user()->id)
            ->where('platform', $platform)
            ->delete();

        return response()->json(['success' => true]);
    }

    // ── GET /api/internal/social-accounts/{userId}/{platform} — interne ──
    public function getForAgent(int $userId, string $platform)
    {
        $account = SocialAccount::where('user_id', $userId)
            ->where('platform', $platform)
            ->where('is_active', true)
            ->first();

        if (!$account) {
            return response()->json(['message' => 'Compte non connecté'], 404);
        }

        return response()->json([
            'platform'          => $account->platform,
            'page_id'           => $account->page_id,
            'page_name'         => $account->page_name,
            'ig_user_id'        => $account->ig_user_id,
            'tiktok_open_id'    => $account->tiktok_open_id,
            'decrypted_token'   => $account->decrypted_token, // ← token déchiffré pour l'agent
        ]);
    }

    // ── POST /api/internal/marketing-campaigns — interne ─────────────────
    public function saveCampaign(Request $request)
    {
        $campaign = \App\Models\MarketingCampaign::create([
            'owner_id'    => $request->owner_id,
            'vehicule_id' => $request->vehicule_id,
            'platform'    => $request->platform,
            'post_id'     => $request->post_id,
            'post_url'    => $request->post_url,
            'content'     => $request->content,
            'status'      => $request->get('status', 'published'),
        ]);

        return response()->json(['success' => true, 'id' => $campaign->id], 201);
    }

    private function verifyFacebookToken(string $token): array
    {
        try {
            $resp = Http::timeout(5)->get(
                "https://graph.facebook.com/v19.0/me",
                ['access_token' => $token]
            );
            if ($resp->successful() && isset($resp->json()['id'])) {
                return ['valid' => true];
            }
            return ['valid' => false, 'error' => $resp->json()['error']['message'] ?? 'Token invalide'];
        } catch (\Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }

    private function formatAccount(SocialAccount $a): array
    {
        return [
            'id'           => $a->id,
            'platform'     => $a->platform,
            'page_name'    => $a->page_name,
            'page_id'      => $a->page_id,
            'ig_user_id'   => $a->ig_user_id,
            'is_active'    => $a->is_active,
            'connected'    => true,
            'last_used_at' => $a->last_used_at,
        ];
    }
}
