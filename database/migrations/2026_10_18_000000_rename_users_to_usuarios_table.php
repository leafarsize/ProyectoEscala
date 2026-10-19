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
        Schema::rename('users', 'usuarios');

        Schema::table('usuarios', function (Blueprint $table) {
            $table->enum('rol', ['laboratorista', 'jefe_laboratorio'])->default('laboratorista')->after('password');
            // true cuando el jefe de laboratorio crea la cuenta con contraseña temporal
            $table->boolean('debe_cambiar_password')->default(false)->after('rol');
            $table->foreignId('creado_por')->nullable()->after('debe_cambiar_password')
                ->constrained('usuarios')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropConstrainedForeignId('creado_por');
            $table->dropColumn(['rol', 'debe_cambiar_password']);
        });

        Schema::rename('usuarios', 'users');
    }
};
