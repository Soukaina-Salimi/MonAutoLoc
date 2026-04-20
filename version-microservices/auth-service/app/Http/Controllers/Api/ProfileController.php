<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OwnerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;  // ← Ajouter cette ligne

class ProfileController extends Controller
{
    // ── GET /api/profile ──────────────────────────────────────────────────
    public function show(Request $request)
    {
        $user = $request->user()->load('role', 'ownerServices', 'documents');
        return response()->json($this->formatUser($user));
    }

    // ── PUT /api/profile ──────────────────────────────────────────────────
    public function update(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'first_name'         => 'nullable|string|max:100',
                'last_name'          => 'nullable|string|max:100',
                'name'               => 'nullable|string|max:100',
                'phone'              => 'nullable|string|max:20',
                'city'               => 'nullable|string|max:100',
                'address'            => 'nullable|string|max:255',
                'date_of_birth'      => 'nullable|date',
                'gender'             => 'nullable|in:male,female,other',
                'bio'                => 'nullable|string|max:500',
                'services'           => 'nullable|array',
                'services.*'         => 'in:location,transport_bagages,livraison_colis,demenagement',
                // Agence
                'is_agency'          => 'nullable|boolean',
                'agency_name'        => 'nullable|string|max:150',
                'agency_description' => 'nullable|string|max:1000',
                'agency_rc'          => 'nullable|string|max:50',
                'agency_phone'       => 'nullable|string|max:20',
                'agency_website'     => 'nullable|string|max:255',
            ]);

            // Si is_agency passe à false → effacer les données agence
            if (isset($validated['is_agency']) && !$validated['is_agency']) {
                $validated['agency_name']        = null;
                $validated['agency_description'] = null;
                $validated['agency_rc']          = null;
                $validated['agency_phone']       = null;
                $validated['agency_website']     = null;
            }

            // Mettre à jour le name depuis first_name + last_name
            if (!empty($validated['first_name']) || !empty($validated['last_name'])) {
                $fn = $validated['first_name'] ?? $user->first_name;
                $ln = $validated['last_name']  ?? $user->last_name;
                $validated['name'] = trim("$fn $ln");
            }

            // Vérifier si profil complet
            $user->update($validated);
            $this->checkProfileCompleted($user);

            // Sync services si owner
            if ($user->role->name === 'owner' && isset($validated['services'])) {
                $this->syncServices($user, $validated['services']);
            }

            $user->refresh()->load('role', 'ownerServices', 'documents');

            return response()->json([
                'success' => true,
                'user'    => $this->formatUser($user),
            ]);
        } catch (\Exception $e) {
            Log::error('Profile update error: ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la mise à jour'], 500);
        }
    }

    // ── POST /api/profile/avatar ──────────────────────────────────────────
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json([
            'success'    => true,
            'avatar_url' => asset('storage/' . $path),
        ]);
    }

    // ── DELETE /api/profile/avatar ────────────────────────────────────────
    public function deleteAvatar(Request $request)
    {
        $user = $request->user();
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->update(['avatar' => null]);
        }
        return response()->json(['success' => true]);
    }

    // ── POST /api/profile/agency-logo ─────────────────────────────────────
    public function uploadAgencyLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $user = $request->user();

        if ($user->agency_logo) {
            Storage::disk('public')->delete($user->agency_logo);
        }

        $filename = "agency_{$user->id}_" . time() . '.' . $request->file('logo')->extension();
        $path     = $request->file('logo')->storeAs('agency-logos', $filename, 'public');
        $user->update(['agency_logo' => $path]);

        return response()->json([
            'success'  => true,
            'logo_url' => asset('storage/' . $path),
        ]);
    }

    // ── DELETE /api/profile/agency-logo ───────────────────────────────────
    public function deleteAgencyLogo(Request $request)
    {
        $user = $request->user();
        if ($user->agency_logo) {
            Storage::disk('public')->delete($user->agency_logo);
            $user->update(['agency_logo' => null]);
        }
        return response()->json(['success' => true]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private function syncServices($user, array $services): void
    {
        // Désactiver tous les services existants
        $user->ownerServices()->update(['is_active' => false]);

        foreach ($services as $serviceType) {
            $user->ownerServices()->updateOrCreate(
                ['service_type' => $serviceType],
                ['is_active' => true]
            );
        }
    }

    private function checkProfileCompleted($user): void
    {
        $required = ['first_name', 'last_name', 'phone', 'city', 'date_of_birth', 'gender'];
        $completed = true;
        foreach ($required as $field) {
            if (empty($user->$field)) {
                $completed = false;
                break;
            }
        }
        if ($completed !== $user->profile_completed) {
            $user->update(['profile_completed' => $completed]);
        }
    }

    private function formatUser($user): array
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
            'cin_number'        => $user->cin_number,
            'cin_expiry_date'   => $user->cin_expiry_date,
            'permis_number'     => $user->permis_number,
            'permis_categories' => $user->permis_categories,
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
            'role' => [
                'id'   => $user->role->id,
                'name' => $user->role->name,
            ],
            'owner_services' => $user->ownerServices
                ? $user->ownerServices->map(fn($s) => [
                    'id'           => $s->id,
                    'service_type' => $s->service_type,
                    'is_active'    => $s->is_active,
                ])->toArray()
                : [],
            'documents' => $user->documents
                ? $user->documents->map(fn($d) => [
                    'id'                 => $d->id,
                    'type'               => $d->type,
                    'status'             => $d->status,
                    'cross_validated_at' => $d->cross_validated_at,
                ])->toArray()
                : [],
        ];
    }

    // ── PUT /api/profile/password ────────────────────────────────────────────
    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required|string',
                'password' => 'required|string|min:8|confirmed',
            ]);

            $user = $request->user();

            // Vérifier l'ancien mot de passe
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Le mot de passe actuel est incorrect.'
                ], 422);
            }

            // Mettre à jour le mot de passe
            $user->update([
                'password' => Hash::make($request->password)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Mot de passe modifié avec succès.'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Password change error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors du changement de mot de passe.'
            ], 500);
        }
    }
}
