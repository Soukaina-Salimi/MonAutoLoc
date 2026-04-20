<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    // ── GET /api/users/{id} — route interne ───────────────────────────────
    public function show(int $id)
    {
        $user = User::with('role', 'ownerServices')->find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json([
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
            'avatar'            => $user->avatar
                ? asset('storage/' . $user->avatar)
                : null,
            // Agence
            'is_agency'         => $user->is_agency,
            'agency_name'       => $user->agency_name,
            'agency_logo'       => $user->agency_logo
                ? asset('storage/' . $user->agency_logo)
                : null,
            'agency_description'=> $user->agency_description,
            'agency_rc'         => $user->agency_rc,
            'agency_phone'      => $user->agency_phone,
            'agency_website'    => $user->agency_website,
            'role' => [
                'id'   => $user->role->id,
                'name' => $user->role->name,
            ],
            'owner_services' => $user->ownerServices
                ? $user->ownerServices->where('is_active', true)
                    ->map(fn($s) => ['service_type' => $s->service_type])
                    ->values()->toArray()
                : [],
        ]);
    }
}