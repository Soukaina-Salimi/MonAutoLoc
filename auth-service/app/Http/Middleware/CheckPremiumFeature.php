<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\OwnerAiFeature;

class CheckPremiumFeature
{
    public function handle(Request $request, Closure $next, string $featureName)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Vérifier si l'owner a cette feature active
        $hasFeature = OwnerAiFeature::where('owner_id', $user->id)
            ->where('feature_name', $featureName)
            ->where('active', true)
            ->exists();

        if (!$hasFeature) {
            return response()->json([
                'message' => 'Abonnement requis pour accéder à cette fonctionnalité',
                'feature' => $featureName,
                'upgrade_url' => '/owner/abonnement'
            ], 403);
        }

        return $next($request);
    }
}
