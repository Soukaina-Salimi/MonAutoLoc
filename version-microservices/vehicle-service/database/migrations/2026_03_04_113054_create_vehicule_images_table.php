<?php
// vehicle-service/database/migrations/2024_01_01_000002_create_vehicule_images_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicule_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicule_id')
                ->constrained('vehicules')
                ->cascadeOnDelete();

            $table->string('path');
            $table->unsignedTinyInteger('order')->default(0);

            $table->timestamps();

            $table->index(['vehicule_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicule_images');
    }
};