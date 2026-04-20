<?php
// vehicle-service/database/migrations/2024_01_01_000001_create_vehicules_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicules', function (Blueprint $table) {
            $table->id();

            // owner (pas de FK cross-service — juste l'ID)
            $table->unsignedBigInteger('user_id');

            // ── Identité du véhicule ──────────────────────────────────────
            $table->string('brand', 80);
            $table->string('model', 80);
            $table->unsignedSmallInteger('year')->nullable();

            $table->enum('category', [
                'voiture',
                'suv',
                'utilitaire',
                'camion',
                'moto',
                'van',
                'minibus',
            ])->default('voiture');

            // ── Caractéristiques techniques ───────────────────────────────
            $table->enum('fuel_type', [
                'essence',
                'diesel',
                'hybride',
                'electrique',
                'gpl',
            ])->nullable();

            $table->enum('transmission', [
                'manuelle',
                'automatique',
            ])->nullable();

            $table->unsignedTinyInteger('seats')->nullable();
            $table->unsignedSmallInteger('engine_cc')->nullable();
            $table->unsignedTinyInteger('puissance')->nullable();

            // ── Immatriculation (visible dans contrat, pas dans chatbot) ──
            $table->string('immatriculation', 20)->nullable();

            // ── Localisation ──────────────────────────────────────────────
            $table->string('city', 100)->nullable();
            $table->string('address')->nullable();

            // ── Description et prix ───────────────────────────────────────
            $table->text('description')->nullable();
            $table->decimal('price_per_day', 10, 2);

            // ── Chauffeur ─────────────────────────────────────────────────
            $table->boolean('offers_driver')->default(false);
            $table->decimal('driver_daily_rate', 8, 2)->nullable();

            // ── Statut ────────────────────────────────────────────────────
            $table->enum('status', [
                'available',
                'unavailable',
                'maintenance',
            ])->default('available');

            $table->timestamps();

            $table->index('user_id');
            $table->index('city');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicules');
    }
};