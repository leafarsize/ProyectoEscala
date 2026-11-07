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
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->string('medicamento', 150)->nullable()->after('nombre');
            $table->string('duracion', 50)->nullable()->after('medicamento');
            $table->string('temperatura', 50)->nullable()->after('duracion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->dropColumn(['medicamento', 'duracion', 'temperatura']);
        });
    }
};
