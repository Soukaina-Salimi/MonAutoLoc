<?php
// auth-service/database/migrations/2024_01_01_000002_create_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();

            // ── Identité ──────────────────────────────────────────────────
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('phone', 20)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('address')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('avatar')->nullable();
            $table->text('bio')->nullable();
            $table->boolean('profile_completed')->default(false);

            // ── CIN ───────────────────────────────────────────────────────
            $table->string('cin_number', 20)->nullable();
            $table->date('cin_expiry_date')->nullable();

            // ── Permis de conduire ────────────────────────────────────────
            $table->string('permis_number', 30)->nullable();
            $table->string('permis_categories', 50)->nullable();
            $table->date('permis_birth_date')->nullable();
            $table->date('permis_issue_date')->nullable();
            $table->date('permis_expiry_date')->nullable();

            // ── Agence (si is_agency = true) ──────────────────────────────
            $table->boolean('is_agency')->default(false);
            $table->string('agency_name', 150)->nullable();
            $table->string('agency_logo', 255)->nullable();
            $table->text('agency_description')->nullable();
            $table->string('agency_rc', 50)->nullable();
            $table->string('agency_phone', 20)->nullable();
            $table->string('agency_website', 255)->nullable();

            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};