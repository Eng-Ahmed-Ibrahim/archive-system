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
        Schema::create('retention_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_id')->constrained('document_types')->cascadeOnDelete();
            $table->unsignedInteger('retention_years')->default(5);
            $table->string('after_action')->default('archive'); // archive, delete
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retention_policies');
    }
};
