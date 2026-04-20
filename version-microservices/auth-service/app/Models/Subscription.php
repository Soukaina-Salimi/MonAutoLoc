<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'plan',
        'status',
        'payment_proof',
        'payment_amount',
        'started_at',
        'expires_at',
    ];

    protected $casts = [
        'started_at'     => 'datetime',
        'expires_at'     => 'datetime',
        'payment_amount' => 'decimal:2',
    ];

    const PLANS = ['standard', 'premium_ia'];

    const STATUSES = ['pending', 'active', 'expired', 'cancelled'];

    // ── Relations ──────────────────────────────────────────────────────────

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->expires_at
            && $this->expires_at->isFuture();
    }

    public function isPremiumIa(): bool
    {
        return $this->plan === 'premium_ia' && $this->isActive();
    }
}