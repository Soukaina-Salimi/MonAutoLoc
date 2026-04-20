<?php
// auth-service/database/migrations/2024_01_01_000005_create_owner_services_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->enum('service_type', [
                'location',
                'transport_bagages',
                'livraison_colis',
                'demenagement',
            ]);

            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->string('coverage_area', 255)->nullable();
            $table->decimal('base_price', 10, 2)->nullable();

            $table->timestamps();

            // Un owner ne peut avoir qu'un service de chaque type
            $table->unique(['user_id', 'service_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_services');
    }
};