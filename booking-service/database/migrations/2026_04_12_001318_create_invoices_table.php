<?php
// booking-service/database/migrations/2024_01_01_000003_create_invoices_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();

            // Polymorphique — booking ou service_request
            $table->string('invoiceable_type');    // "booking" ou "service_request"
            $table->unsignedBigInteger('invoiceable_id');

            // IDs cross-service
            $table->unsignedBigInteger('owner_id');
            $table->unsignedBigInteger('client_id');

            // Format : FAC-2026-04-000042
            $table->string('invoice_number', 30)->unique();

            // ── Montants ──────────────────────────────────────────────────
            $table->decimal('amount_ht', 10, 2);
            $table->decimal('tva', 5, 2)->default(20.00); // TVA Maroc 20%
            $table->decimal('amount_ttc', 10, 2);

            $table->string('pdf_path')->nullable();
            $table->timestamp('sent_at')->nullable();

            $table->timestamps();

            $table->index(['invoiceable_type', 'invoiceable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};