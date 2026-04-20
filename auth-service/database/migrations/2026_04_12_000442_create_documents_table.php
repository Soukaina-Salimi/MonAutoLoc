<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->enum('type', [
                'cin',
                'cin_verso',
                'permis',
                'permis_verso',
                'carte_grise',
                'carte_grise_verso',
            ]);

            $table->string('file_path');
            $table->json('extracted_data')->nullable();

            $table->enum('status', ['pending', 'verified', 'rejected'])
                ->default('pending');

            $table->timestamp('verified_at')->nullable();
            $table->timestamp('cross_validated_at')->nullable();

            $table->timestamps();

            // Un user ne peut avoir qu'un document de chaque type
            $table->unique(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};