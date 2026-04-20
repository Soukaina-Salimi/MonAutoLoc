<?php
// auth-service/database/migrations/2024_01_01_000006_create_service_requests_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('client_id');
            $table->foreign('client_id')->references('id')->on('users')->cascadeOnDelete();

            $table->unsignedBigInteger('owner_id');
            $table->foreign('owner_id')->references('id')->on('users')->cascadeOnDelete();

            $table->enum('service_type', [
                'transport_bagages',
                'livraison_colis',
                'demenagement',
            ]);

            $table->enum('status', [
                'pending',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
                'rejected',
            ])->default('pending');

            // ── Trajet ────────────────────────────────────────────────────
            $table->string('pickup_city', 100)->nullable();
            $table->string('delivery_city', 100)->nullable();
            $table->string('pickup_address')->nullable();
            $table->string('delivery_address')->nullable();

            // ── Planification ─────────────────────────────────────────────
            $table->date('pickup_date')->nullable();
            $table->time('pickup_time')->nullable();

            // ── Détails spécifiques au service (JSON) ─────────────────────
            // Pour bagages: nb_bagages, poids_total, fragile
            // Pour livraison: type_colis, poids, dimensions, fragile
            // Pour déménagement: type_logement, volume_m3, etage_depart, etage_arrivee, ascenseur
            $table->json('service_details')->nullable();

            // ── Notes et prix ─────────────────────────────────────────────
            $table->text('client_notes')->nullable();
            $table->text('owner_notes')->nullable();
            $table->decimal('estimated_price', 10, 2)->nullable();
            $table->decimal('final_price', 10, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};