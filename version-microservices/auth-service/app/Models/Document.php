<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'file_path',
        'extracted_data',
        'status',
        'verified_at',
        'cross_validated_at',
    ];

    protected $casts = [
        'extracted_data'     => 'array',
        'verified_at'        => 'datetime',
        'cross_validated_at' => 'datetime',
    ];

    // Types valides
    const TYPES = [
        'cin',
        'cin_verso',
        'permis',
        'permis_verso',
        'carte_grise',
        'carte_grise_verso',
    ];

    // Statuts valides
    const STATUSES = [
        'pending',
        'verified',
        'rejected',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isVerified(): bool
    {
        return $this->status === 'verified';
    }

    public function isCrossValidated(): bool
    {
        return !is_null($this->cross_validated_at);
    }
}