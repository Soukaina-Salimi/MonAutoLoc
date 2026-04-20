<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehiculeImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicule_id',
        'path',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->path);
    }
}