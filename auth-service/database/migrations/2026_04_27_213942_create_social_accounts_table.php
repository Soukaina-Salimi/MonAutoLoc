<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->enum('platform', ['facebook', 'instagram', 'tiktok']);

            // Tokens d'accès (chiffrés)
            $table->text('page_access_token')->nullable();
            $table->string('page_id', 100)->nullable();        // Facebook Page ID
            $table->string('page_name', 150)->nullable();      // Nom de la page
            $table->string('page_avatar', 255)->nullable();    // Photo de la page

            // Instagram
            $table->string('ig_user_id', 100)->nullable();

            // TikTok
            $table->string('tiktok_open_id', 100)->nullable();

            // Statut
            $table->boolean('is_active')->default(true);
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};
