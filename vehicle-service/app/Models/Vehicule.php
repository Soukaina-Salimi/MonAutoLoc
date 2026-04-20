<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'brand',
        'model',
        'year',
        'category',
        'fuel_type',
        'transmission',
        'seats',
        'engine_cc',
        'puissance',
        'immatriculation',
        'city',
        'address',
        'description',
        'price_per_day',
        'offers_driver',
        'driver_daily_rate',
        'status',
    ];

    protected $casts = [
        'price_per_day'     => 'decimal:2',
        'driver_daily_rate' => 'decimal:2',
        'offers_driver'     => 'boolean',
        'seats'             => 'integer',
        'year'              => 'integer',
        'engine_cc'         => 'integer',
        'puissance'         => 'integer',
    ];

    const CATEGORIES = [
        'voiture', 'suv', 'utilitaire', 'camion',
        'moto', 'van', 'minibus',
    ];

    const FUEL_TYPES = [
        'essence', 'diesel', 'hybride', 'electrique', 'gpl',
    ];

    const STATUSES = [
        'available', 'unavailable', 'maintenance',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function images()
    {
        return $this->hasMany(VehiculeImage::class)
            ->orderBy('order');
    }

    public function firstImage()
    {
        return $this->hasOne(VehiculeImage::class)
            ->orderBy('order');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    public function getImageUrlAttribute(): ?string
    {
        $first = $this->images->first();
        return $first ? asset('storage/' . $first->path) : null;
    }
}