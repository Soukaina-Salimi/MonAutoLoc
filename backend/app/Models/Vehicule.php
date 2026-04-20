<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

/**
 * @property \App\Models\User $user
 */

class Vehicule extends Model
{

    use HasFactory;

    protected $fillable = [
        'user_id',
        'brand',
        'model',
        'category',
        'year',
        'price_per_day',
        'fuel_type',
        'transmission',
        'seats',
        'engine_cc',        // Pour motos/scooters
        'puissance',
        'city',
        'address',
        'available',
        'status',
        'rating',
        'views',
        'license_plate',
        'description',
        'image',
    ];
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if ($this->relationLoaded('images') && $this->images->isNotEmpty()) {
            return asset('storage/' . $this->images->first()->path);
        }

        return null;
    }

    public function getAverageRatingAttribute()
    {
        return round($this->reviews()->avg('rating'), 1);
    }

    public function images()
    {
        return $this->hasMany(VehiculeImage::class);
    }
}
