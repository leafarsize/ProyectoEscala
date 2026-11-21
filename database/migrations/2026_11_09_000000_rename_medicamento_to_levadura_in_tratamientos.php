<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * En la tesis de Natalia lo que se aplica al tallo es una levadura de biocontrol
     * (p. ej. M. guilliermondii), no un medicamento. Se conservan los datos existentes.
     */
    public function up(): void
    {
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->renameColumn('medicamento', 'levadura');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tratamientos', function (Blueprint $table) {
            $table->renameColumn('levadura', 'medicamento');
        });
    }
};
