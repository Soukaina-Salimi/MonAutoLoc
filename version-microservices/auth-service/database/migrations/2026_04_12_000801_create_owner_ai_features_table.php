<?php
// auth-service/database/migrations/2024_01_01_000009_create_owner_ai_features_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_ai_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('feature_id')->constrained('ai_features')->cascadeOnDelete();
            $table->boolean('active')->default(false);
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();

            $table->unique(['owner_id', 'feature_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_ai_features');
    }
};