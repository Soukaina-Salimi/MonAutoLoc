<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vehicule_id',
        'start_date',
        'end_date',
        'total_price',
        'with_driver',
        'nb_drivers',
        'driver_price_per_day',
        'status',
        'notes',
    ];

    protected $casts = [
        'start_date'           => 'date',
        'end_date'             => 'date',
        'total_price'          => 'decimal:2',
        'driver_price_per_day' => 'decimal:2',
        'with_driver'          => 'boolean',
        'nb_drivers'           => 'integer',
    ];

    const STATUSES = [
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function contract()
    {
        return $this->hasOne(Contract::class, 'booking_id');
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class, 'invoiceable_id')
            ->where('invoiceable_type', 'booking');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, ['pending', 'approved']);
    }

    public function getNbDaysAttribute(): int
    {
        return max(1, $this->start_date->diffInDays($this->end_date));
    }

    public function getDriverTotalAttribute(): float
    {
        if (!$this->with_driver || !$this->driver_price_per_day) {
            return 0;
        }
        return $this->nb_drivers * $this->driver_price_per_day * $this->nb_days;
    }
}