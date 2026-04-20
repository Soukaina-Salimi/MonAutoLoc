<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicule_id',
        'user_id',
        'booking_id',
        'rating',
        'comment',
    ];

    protected $casts = [
        'rating'     => 'integer',
        'vehicule_id'=> 'integer',
        'user_id'    => 'integer',
        'booking_id' => 'integer',
    ];

    // ── Helpers ────────────────────────────────────────────────────────────

    public function isValidRating(): bool
    {
        return $this->rating >= 1 && $this->rating <= 5;
    }

    public function getStarsAttribute(): string
    {
        return str_repeat('★', $this->rating) . str_repeat('☆', 5 - $this->rating);
    }
}