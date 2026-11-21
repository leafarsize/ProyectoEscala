<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cambios pedidos por el laboratorio (13/11/2026):
     *
     * - Se quita "levadura": cuando se comparan levaduras distintas, el cambio de
     *   levadura ES el tratamiento, así que se escribe en el nombre del tratamiento.
     * - Se quita "duracion" (lista fija de 7/14/21/28 días): cada persona incuba por
     *   periodos distintos, así que ahora se elige la fecha de término en un calendario
     *   y la duración en días se calcula a partir de fecha_inicio.
     */
    public function up(): void
    {
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->date('fecha_fin')->nullable()->after('fecha_inicio');
        });

        Schema::table('tratamientos', function (Blueprint $table) {
            $table->dropColumn(['levadura', 'duracion']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->string('levadura', 150)->nullable()->after('nombre');
            $table->string('duracion', 50)->nullable()->after('levadura');
        });

        Schema::table('tratamientos', function (Blueprint $table) {
            $table->dropColumn('fecha_fin');
        });
    }
};
