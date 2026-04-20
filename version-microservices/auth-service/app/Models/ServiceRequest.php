<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'owner_id',
        'service_type',
        'status',
        'pickup_city',
        'delivery_city',
        'pickup_address',
        'delivery_address',
        'pickup_date',
        'pickup_time',
        'service_details',
        'client_notes',
        'owner_notes',
        'estimated_price',
        'final_price',
    ];

    protected $casts = [
        'pickup_date'     => 'date',
        'service_details' => 'array',
        'estimated_price' => 'decimal:2',
        'final_price'     => 'decimal:2',
    ];

    const STATUSES = [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'rejected',
    ];

    const SERVICE_TYPES = [
        'transport_bagages',
        'livraison_colis',
        'demenagement',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    public function getEffectivePrice(): float
    {
        return $this->final_price ?? $this->estimated_price ?? 0;
    }
}