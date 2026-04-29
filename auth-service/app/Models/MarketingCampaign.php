<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingCampaign extends Model
{
    use HasFactory;

    protected $table = 'marketing_campaigns';

    protected $fillable = [
        'owner_id',
        'vehicule_id',
        'platform',
        'post_id',
        'post_url',
        'content',
        'tone',
        'language',
        'promo_price',
        'reach',
        'impressions',
        'likes',
        'comments',
        'shares',
        'clicks',
        'status',
    ];

    protected $casts = [
        'promo_price' => 'decimal:2',
        'reach' => 'integer',
        'impressions' => 'integer',
        'likes' => 'integer',
        'comments' => 'integer',
        'shares' => 'integer',
        'clicks' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
