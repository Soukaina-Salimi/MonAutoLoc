<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\ResetPasswordMail;

class AuthController extends Controller
{
    // ── POST /api/register ────────────────────────────────────────────────
    public function register(Request $request)
    {
        try {
            $request->validate([
                'name'       => 'required|string|max:100',
                'email'      => 'required|email|unique:users,email',
                'password'   => 'required|string|min:6|confirmed',
                'role'       => 'required|in:client,owner',
                'services'   => 'nullable|array',
                'services.*' => 'in:location,transport_bagages,livraison_colis,demenagement',
            ]);

            $role = Role::where('name', $request->role)->firstOrFail();

            $user = User::create([
                'role_id'  => $role->id,
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => Hash::make($request->password),
            ]);

            // Créer les services si owner
            if ($request->role === 'owner' && !empty($request->services)) {
                foreach ($request->services as $serviceType) {
                    $user->ownerServices()->create([
                        'service_type' => $serviceType,
                        'is_active'    => true,
                    ]);
                }
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => $this->formatUser($user->load('role', 'ownerServices')),
            ], 201);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Register error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de l\'inscription'], 500);
        }
    }

    // ── POST /api/login ───────────────────────────────────────────────────
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email'    => 'required|email',
                'password' => 'required|string',
            ]);

            $user = User::with('role', 'ownerServices')
                ->where('email', $request->email)
                ->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Email ou mot de passe incorrect'
                ], 401);
            }

            // Révoquer les anciens tokens
            $user->tokens()->delete();

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => $this->formatUser($user),
            ]);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la connexion'], 500);
        }
    }

    // ── POST /api/logout ──────────────────────────────────────────────────
    public function logout(Request $request)
    {
        try {
            $request->user()->tokens()->delete();
            return response()->json(['message' => 'Déconnecté avec succès']);
        } catch (\Exception $e) {
            Log::error('Logout error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la déconnexion'], 500);
        }
    }

    // ── GET /api/me ───────────────────────────────────────────────────────
    public function me(Request $request)
    {
        try {
            $user = $request->user()->load('role', 'ownerServices', 'documents');
            return response()->json($this->formatUser($user));
        } catch (\Exception $e) {
            Log::error('Me error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur'], 500);
        }
    }


    // ── POST /api/forgot-password ──────────────────────────────────────────────
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Générer un token manuellement
        $token = Str::random(60);

        // Stocker dans password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Envoyer l'email avec le token
        $resetUrl = env('FRONTEND_URL', 'http://localhost:3000') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);

        // Utiliser Mail directement (sans Password::sendResetLink)
        Mail::to($user->email)->send(new ResetPasswordMail($token, $user->email));

        return response()->json([
            'message' => 'Un lien de réinitialisation a été envoyé à votre adresse email.',
        ], 200);
    }

    // ── POST /api/reset-password ───────────────────────────────────────────────
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email|exists:users,email',
            'password' => 'required|min:8|confirmed',
        ]);

        // Vérifier le token
        $reset = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$reset || !Hash::check($request->token, $reset->token)) {
            return response()->json([
                'message' => 'Token invalide ou expiré.',
            ], 400);
        }

        // Vérifier si le token n'a pas expiré (60 minutes)
        if (now()->diffInMinutes($reset->created_at) > 60) {
            return response()->json([
                'message' => 'Le lien a expiré. Veuillez renvoyer une demande.',
            ], 400);
        }

        // Mettre à jour le mot de passe
        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        // Supprimer le token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès.',
        ], 200);
    }



    // ── Helper ────────────────────────────────────────────────────────────
    private function formatUser(User $user): array
    {
        return [
            'id'                => $user->id,
            'name'              => $user->name,
            'first_name'        => $user->first_name,
            'last_name'         => $user->last_name,
            'email'             => $user->email,
            'phone'             => $user->phone,
            'city'              => $user->city,
            'address'           => $user->address,
            'date_of_birth'     => $user->date_of_birth,
            'gender'            => $user->gender,
            'bio'               => $user->bio,
            'profile_completed' => $user->profile_completed,
            'avatar'            => $user->avatar
                ? asset('storage/' . $user->avatar)
                : null,
            // Agence
            'is_agency'         => $user->is_agency,
            'agency_name'       => $user->agency_name,
            'agency_logo_url'   => $user->agency_logo
                ? asset('storage/' . $user->agency_logo)
                : null,
            'agency_description' => $user->agency_description,
            'agency_rc'         => $user->agency_rc,
            'agency_phone'      => $user->agency_phone,
            'agency_website'    => $user->agency_website,
            // Rôle
            'role' => [
                'id'   => $user->role->id,
                'name' => $user->role->name,
            ],
            // Services owner
            'owner_services' => $user->ownerServices
                ? $user->ownerServices->map(fn($s) => [
                    'id'           => $s->id,
                    'service_type' => $s->service_type,
                    'is_active'    => $s->is_active,
                ])->toArray()
                : [],
        ];
    }
}
