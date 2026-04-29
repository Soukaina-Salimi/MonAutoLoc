<?php
// auth-service/app/Models/SocialAccount.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class SocialAccount extends Model
{
    protected $fillable = [
        'user_id',
        'platform',
        'page_access_token',
        'page_id',
        'page_name',
        'page_avatar',
        'ig_user_id',
        'tiktok_open_id',
        'is_active',
        'token_expires_at',
        'last_used_at',
    ];

    protected $hidden = ['page_access_token'];

    protected $casts = [
        'is_active'        => 'boolean',
        'token_expires_at' => 'datetime',
        'last_used_at'     => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Chiffrer le token avant de le stocker
    public function setPageAccessTokenAttribute(string $value): void
    {
        $this->attributes['page_access_token'] = Crypt::encryptString($value);
    }

    // Déchiffrer le token à la lecture
    public function getDecryptedTokenAttribute(): ?string
    {
        try {
            return $this->page_access_token
                ? Crypt::decryptString($this->page_access_token)
                : null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
