<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehiculeImage extends Model
{
    protected $fillable = [
        'vehicule_id',
        'path'
    ];

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }
}
