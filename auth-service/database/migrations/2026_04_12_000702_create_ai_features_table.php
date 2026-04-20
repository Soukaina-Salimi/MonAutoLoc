<?php
// auth-service/database/migrations/2024_01_01_000008_create_ai_features_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_features', function (Blueprint $table) {
            $table->id();
            $table->string('feature_name')->unique();
            // chatbot_indexing, demand_prediction, recommendations,
            // dynamic_pricing, client_score, monthly_report
            $table->text('description')->nullable();
            $table->decimal('monthly_price', 8, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_features');
    }
};