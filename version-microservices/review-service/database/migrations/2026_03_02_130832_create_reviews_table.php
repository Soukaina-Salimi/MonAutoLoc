<?php
// review-service/database/migrations/2024_01_01_000001_create_reviews_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            // IDs cross-service (pas de FK)
            $table->unsignedBigInteger('vehicule_id');
            $table->unsignedBigInteger('user_id');      // client
            $table->unsignedBigInteger('booking_id')->unique();
            // unique → 1 avis par réservation

            $table->unsignedTinyInteger('rating');
            // 1 à 5 — enforced au niveau application

            $table->text('comment')->nullable();

            $table->timestamps();

            $table->index('vehicule_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};