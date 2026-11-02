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
        // Identifica el tallo de la foto dentro del tratamiento (p. ej. "Caña 5")
        Schema::table('escaneos', function (Blueprint $table) {
            $table->string('numero_cana', 50)->nullable()->after('tratamiento_id');
        });

        // Ya no se piden al iniciar el tratamiento; las columnas quedan para los datos existentes
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->string('variedad', 100)->nullable()->change();
            $table->string('lote', 100)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Los tratamientos creados sin estos datos impedirían volver a NOT NULL
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->string('variedad', 100)->nullable()->change();
            $table->string('lote', 100)->nullable()->change();
        });

        Schema::table('escaneos', function (Blueprint $table) {
            $table->dropColumn('numero_cana');
        });
    }
};
