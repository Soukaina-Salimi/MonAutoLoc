<?php
// booking-service/database/migrations/2024_01_01_000001_create_bookings_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();

            // IDs cross-service (pas de FK)
            $table->unsignedBigInteger('user_id');       // client
            $table->unsignedBigInteger('vehicule_id');

            // ── Dates ─────────────────────────────────────────────────────
            $table->date('start_date');
            $table->date('end_date');

            // ── Prix ──────────────────────────────────────────────────────
            $table->decimal('total_price', 10, 2);

            // ── Chauffeur ─────────────────────────────────────────────────
            $table->boolean('with_driver')->default(false);
            $table->unsignedTinyInteger('nb_drivers')->default(0);
            $table->decimal('driver_price_per_day', 8, 2)->nullable();

            // ── Statut ────────────────────────────────────────────────────
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'cancelled',
                'completed',
            ])->default('pending');

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('user_id');
            $table->index('vehicule_id');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};