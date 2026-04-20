<?php
// auth-service/database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Roles ─────────────────────────────────────────────────────────
        DB::table('roles')->insertOrIgnore([
            ['id' => 1, 'name' => 'admin',  'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'owner',  'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'client', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // ── Admin par défaut ───────────────────────────────────────────────
        DB::table('users')->insertOrIgnore([
            'role_id'           => 1,
            'name'              => 'Admin',
            'first_name'        => 'Admin',
            'last_name'         => 'System',
            'email'             => 'admin@autorent.ma',
            'password'          => Hash::make('password'),
            'profile_completed' => true,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // ── Modules IA disponibles ─────────────────────────────────────────
        DB::table('ai_features')->insertOrIgnore([
            ['feature_name' => 'chatbot_indexing',  'description' => 'Indexation dans le chatbot IA',    'monthly_price' => 15,  'created_at' => now(), 'updated_at' => now()],
            ['feature_name' => 'demand_prediction', 'description' => 'Prédiction de la demande',         'monthly_price' => 50,  'created_at' => now(), 'updated_at' => now()],
            ['feature_name' => 'recommendations',   'description' => 'Recommandations intelligentes',    'monthly_price' => 40,  'created_at' => now(), 'updated_at' => now()],
            ['feature_name' => 'dynamic_pricing',   'description' => 'Pricing dynamique automatique',    'monthly_price' => 60,  'created_at' => now(), 'updated_at' => now()],
            ['feature_name' => 'client_score',      'description' => 'Score de confiance client',        'monthly_price' => 30,  'created_at' => now(), 'updated_at' => now()],
            ['feature_name' => 'monthly_report',    'description' => 'Rapport IA mensuel automatique',   'monthly_price' => 25,  'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}