<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehicules', function (Blueprint $table) {
            // Catégorie du véhicule
            $table->enum('category', [
                'voiture',
                'moto',
                'scooter',
                'camion',
                'utilitaire',
                'van',
                'velo',
                'trottinette',
                'quad',
                'bateau'
            ])->default('voiture')->after('model');

            // Caractéristiques techniques
            $table->string('fuel_type')->default('Essence')->after('year');
            $table->string('transmission')->default('Manuelle')->after('fuel_type');

            // Nombre de places (pour voitures) ou cylindrée (pour motos)
            $table->integer('seats')->nullable()->after('transmission');

            // Pour motos/scooters
            $table->integer('engine_cc')->nullable()->after('seats'); // Cylindrée en cm3

            // Localisation
            $table->string('city')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicules', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'fuel_type',
                'transmission',
                'seats',
                'engine_cc',
                'city'
            ]);
        });
    }
};
