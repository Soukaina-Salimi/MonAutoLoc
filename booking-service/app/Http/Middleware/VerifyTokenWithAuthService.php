<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class VerifyTokenWithAuthService
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Demander à auth-service de valider le token
        $response = Http::withToken($token)
            ->get(env('AUTH_SERVICE_URL') . '/api/me');

        if ($response->failed()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Injecter l'user dans la request
        $request->merge(['auth_user' => $response->json()]);

        return $next($request);
    }
}