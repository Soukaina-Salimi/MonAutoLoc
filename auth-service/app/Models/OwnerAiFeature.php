<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OwnerAiFeature extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'feature_id',
        'active',
        'activated_at',
    ];

    protected $casts = [
        'active'       => 'boolean',
        'activated_at' => 'datetime',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function feature()
    {
        return $this->belongsTo(AiFeature::class, 'feature_id');
    }
}