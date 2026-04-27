<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable(); // null = visiteur anonyme
            $table->string('session_id', 64)->index();         // identifiant session
            $table->string('ip_address', 45)->nullable();

            // Message
            $table->text('user_message');
            $table->text('bot_response');
            $table->string('intent', 50)->nullable();          // search_vehicle, search_service…
            $table->json('extracted_params')->nullable();       // params extraits par ExtractionAgent
            $table->string('page_context', 50)->nullable();    // general, owner, vehicule…

            // Performance
            $table->unsignedInteger('response_time_ms')->nullable(); // temps de réponse
            $table->unsignedTinyInteger('agents_called')->default(0); // nb d'agents appelés
            $table->boolean('used_cache')->default(false);

            // Résultats
            $table->unsignedTinyInteger('vehicules_returned')->default(0);
            $table->unsignedTinyInteger('services_returned')->default(0);

            // Feedback utilisateur (optionnel)
            $table->tinyInteger('rating')->nullable();         // 1-5
            $table->boolean('was_helpful')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['session_id', 'created_at']);
            $table->index('intent');
            $table->index('page_context');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_logs');
    }
};
