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
            [
                'feature_name'  => 'chatbot_indexing',
                'description'   => 'Vos véhicules apparaissent dans les réponses du chatbot IA AutoRent.',
                'monthly_price' => 0.00,   // GRATUIT
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'demand_prediction',
                'description'   => 'Prédiction de la demande par ville/catégorie sur 30-90 jours (Modèle Prophet).',
                'monthly_price' => 99.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'dynamic_pricing',
                'description'   => 'Suggestion de prix optimal selon la demande, la saison et la concurrence.',
                'monthly_price' => 79.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'client_score',
                'description'   => 'Analyse comportementale RFM + K-Means + prédiction churn de vos clients.',
                'monthly_price' => 129.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'recommendations',
                'description'   => 'Vos véhicules recommandés aux bons clients via Collaborative Filtering.',
                'monthly_price' => 89.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'monthly_report',
                'description'   => 'Rapport PDF mensuel automatique avec KPIs et recommandations IA.',
                'monthly_price' => 49.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'feature_name'  => 'marketing_ia',
                'description'   => 'Publication automatique sur Facebook et Instagram avec contenu généré par IA',
                'monthly_price' => 49.00,
                'created_at' => now(),
                'updated_at' => now()
            ],
        ]);
    }
}
