<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehicule;

class OwnerController extends Controller
{
    // Liste des owners
    public function index()
    {
        $owners = User::where('role_id', '2')
            ->withCount('vehicules')
            ->get();

        return response()->json($owners);
    }

    public function show($id)
    {
        $owner = User::where('role_id', 2)
            ->with(['vehicules.images']) // Cette syntaxe charge les images des véhicules
            ->withCount('vehicules')
            ->findOrFail($id);

        // Ajouter les URLs des images
        foreach ($owner->vehicules as $vehicule) {
            foreach ($vehicule->images as $image) {
                $image->url = asset('storage/' . $image->path);
            }
        }

        return response()->json($owner);
    }
}
