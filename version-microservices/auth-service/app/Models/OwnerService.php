<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OwnerService extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'service_type',
        'is_active',
        'description',
        'coverage_area',
        'base_price',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'base_price' => 'decimal:2',
    ];

    const SERVICE_TYPES = [
        'location',
        'transport_bagages',
        'livraison_colis',
        'demenagement',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}