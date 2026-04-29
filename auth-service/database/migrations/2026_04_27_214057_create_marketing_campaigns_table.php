<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('vehicule_id');

            $table->enum('platform', ['facebook', 'instagram', 'tiktok']);
            $table->string('post_id')->nullable();
            $table->string('post_url')->nullable();
            $table->text('content');
            $table->string('tone', 30)->default('professionnel');
            $table->string('language', 5)->default('fr');
            $table->decimal('promo_price', 10, 2)->nullable();

            // Analytics
            $table->integer('reach')->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('likes')->default(0);
            $table->integer('comments')->default(0);
            $table->integer('shares')->default(0);
            $table->integer('clicks')->default(0);

            $table->enum('status', ['pending', 'published', 'failed', 'scheduled'])
                ->default('pending');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaigns');
    }
};
