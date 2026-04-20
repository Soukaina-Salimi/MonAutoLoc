<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'contract_number',
        'status',
        'pdf_path',
    ];

    const STATUSES = ['draft', 'sent', 'cancelled'];

    // ── Relations ──────────────────────────────────────────────────────────

    public function booking()
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Génère un numéro de contrat unique.
     * Format : CTR-2026-000015
     */
    public static function generateNumber(): string
    {
        $year     = date('Y');
        $lastId   = static::whereYear('created_at', $year)->max('id') ?? 0;
        $sequence = str_pad($lastId + 1, 6, '0', STR_PAD_LEFT);
        return "CTR-{$year}-{$sequence}";
    }

    public function hasPdf(): bool
    {
        return !empty($this->pdf_path);
    }
}