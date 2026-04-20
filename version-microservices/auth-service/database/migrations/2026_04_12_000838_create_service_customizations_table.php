<?php
// auth-service/database/migrations/2024_01_01_000010_create_service_customizations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_customizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();

            $table->enum('service_type', [
                'location',
                'transport_bagages',
                'livraison_colis',
                'demenagement',
            ]);

            $table->string('customization_type', 50);
            // zone, tarif, option, garantie, etc.

            $table->json('details')->nullable();

            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
            ])->default('pending');

            $table->boolean('payment_required')->default(false);
            $table->decimal('payment_amount', 10, 2)->nullable();

            $table->enum('payment_status', ['pending', 'paid'])->nullable();

            $table->text('admin_notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_customizations');
    }
};
