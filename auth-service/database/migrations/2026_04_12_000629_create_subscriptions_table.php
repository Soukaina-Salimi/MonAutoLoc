<?php
// auth-service/database/migrations/2024_01_01_000007_create_subscriptions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        // Nouvelle migration propre

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('feature_id')
                ->constrained('ai_features')
                ->cascadeOnDelete();
            $table->enum('status', ['pending', 'active', 'cancelled', 'expired'])
                ->default('pending');
            $table->decimal('payment_amount', 10, 2);
            $table->string('payment_proof')->nullable();
            $table->string('payment_method')->nullable();
            $table->string('payment_reference')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            // Un owner ne peut avoir qu'un abonnement actif par feature
            $table->unique(['owner_id', 'feature_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
