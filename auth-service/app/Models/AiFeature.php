<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiFeature extends Model
{
    use HasFactory;

    protected $fillable = [
        'feature_name',
        'description',
        'monthly_price',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
    ];

    const FEATURES = [
        'chatbot_indexing',
        'demand_prediction',
        'recommendations',
        'dynamic_pricing',
        'client_score',
        'monthly_report',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function owners()
    {
        return $this->belongsToMany(User::class, 'owner_ai_features', 'feature_id', 'owner_id')
            ->withPivot('active', 'activated_at')
            ->withTimestamps();
    }

    public function ownerAiFeatures()
    {
        return $this->hasMany(OwnerAiFeature::class, 'feature_id');
    }
}