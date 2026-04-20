<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoiceable_type',
        'invoiceable_id',
        'owner_id',
        'client_id',
        'invoice_number',
        'amount_ht',
        'tva',
        'amount_ttc',
        'pdf_path',
        'sent_at',
    ];

    protected $casts = [
        'amount_ht'  => 'decimal:2',
        'tva'        => 'decimal:2',
        'amount_ttc' => 'decimal:2',
        'sent_at'    => 'datetime',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function invoiceable()
    {
        return $this->morphTo();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Génère un numéro de facture unique.
     * Format : FAC-2026-04-000042
     */
    public static function generateNumber(): string
    {
        $year     = date('Y');
        $month    = date('m');
        $lastId   = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->max('id') ?? 0;
        $sequence = str_pad($lastId + 1, 6, '0', STR_PAD_LEFT);
        return "FAC-{$year}-{$month}-{$sequence}";
    }

    /**
     * Calcule le montant TTC depuis le HT avec TVA.
     */
    public static function calculateTtc(float $amountHt, float $tva = 20.0): float
    {
        return round($amountHt * (1 + $tva / 100), 2);
    }

    public function isSent(): bool
    {
        return !is_null($this->sent_at);
    }
}