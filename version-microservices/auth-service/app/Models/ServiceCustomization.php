<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCustomization extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'service_type',
        'customization_type',
        'details',
        'status',
        'payment_required',
        'payment_amount',
        'payment_status',
        'admin_notes',
    ];

    protected $casts = [
        'details'          => 'array',
        'payment_required' => 'boolean',
        'payment_amount'   => 'decimal:2',
    ];

    const STATUSES = ['pending', 'approved', 'rejected'];

    // ── Relations ──────────────────────────────────────────────────────────

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}