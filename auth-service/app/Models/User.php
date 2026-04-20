<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        // Identité
        'role_id',
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'city',
        'address',
        'date_of_birth',
        'gender',
        'avatar',
        'bio',
        'profile_completed',

        // CIN
        'cin_number',
        'cin_expiry_date',

        // Permis
        'permis_number',
        'permis_categories',
        'permis_birth_date',
        'permis_issue_date',
        'permis_expiry_date',

        // Agence
        'is_agency',
        'agency_name',
        'agency_logo',
        'agency_description',
        'agency_rc',
        'agency_phone',
        'agency_website',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'date_of_birth'     => 'date',
        'cin_expiry_date'   => 'date',
        'permis_birth_date' => 'date',
        'permis_issue_date' => 'date',
        'permis_expiry_date'=> 'date',
        'profile_completed' => 'boolean',
        'is_agency'         => 'boolean',
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function ownerServices()
    {
        return $this->hasMany(OwnerService::class);
    }

    public function serviceRequestsAsClient()
    {
        return $this->hasMany(ServiceRequest::class, 'client_id');
    }

    public function serviceRequestsAsOwner()
    {
        return $this->hasMany(ServiceRequest::class, 'owner_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class, 'owner_id');
    }

    public function aiFeatures()
    {
        return $this->belongsToMany(AiFeature::class, 'owner_ai_features', 'owner_id', 'feature_id')
            ->withPivot('active', 'activated_at')
            ->withTimestamps();
    }

    public function ownerAiFeatures()
    {
        return $this->hasMany(OwnerAiFeature::class, 'owner_id');
    }

    public function serviceCustomizations()
    {
        return $this->hasMany(ServiceCustomization::class, 'owner_id');
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    public function hasRole(string $role): bool
    {
        return $this->role?->name === $role;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isOwner(): bool
    {
        return $this->hasRole('owner');
    }

    public function isClient(): bool
    {
        return $this->hasRole('client');
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('expires_at', '>', now())
            ->exists();
    }

    public function hasAiFeature(string $featureName): bool
    {
        return $this->ownerAiFeatures()
            ->whereHas('feature', fn($q) => $q->where('feature_name', $featureName))
            ->where('active', true)
            ->exists();
    }

    // Accessors
    public function getDisplayNameAttribute(): string
    {
        if ($this->is_agency && $this->agency_name) {
            return $this->agency_name;
        }
        return $this->name;
    }

    public function getAgencyLogoUrlAttribute(): ?string
    {
        return $this->agency_logo
            ? asset('storage/' . $this->agency_logo)
            : null;
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar
            ? asset('storage/' . $this->avatar)
            : null;
    }
}