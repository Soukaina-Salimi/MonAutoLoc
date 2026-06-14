<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE vehicules
            MODIFY COLUMN category ENUM(
                'voiture',
                'citadine',
                'berline',
                'suv',
                '4x4',
                'utilitaire',
                'monospace',
                'coupe',
                'cabriolet',
                'luxe',
                'electrique',
                'moto',
                'camion',
                'minibus',
                'van'
            ) NOT NULL DEFAULT 'citadine'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE vehicules
            MODIFY COLUMN category ENUM(
                'voiture',
                'suv',
                'utilitaire',
                'camion',
                'moto',
                'van',
                'minibus'
            ) NOT NULL DEFAULT 'voiture'
        ");
    }
};
