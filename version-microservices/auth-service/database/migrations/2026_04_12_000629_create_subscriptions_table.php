<?php
// auth-service/database/migrations/2024_01_01_000007_create_subscriptions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();

            $table->enum('plan', ['standard', 'premium_ia'])->default('standard');

            $table->enum('status', [
                'pending',
                'active',
                'expired',
                'cancelled',
            ])->default('pending');

            $table->string('payment_proof')->nullable();
            $table->decimal('payment_amount', 10, 2)->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};