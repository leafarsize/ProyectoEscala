<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->cambiarRoles(['laboratorista', 'productor', 'jefe_laboratorio']);

        Schema::table('tratamientos', function (Blueprint $table) {
            // Dueño del cultivo: solo ve el porcentaje de daño de sus tratamientos
            $table->foreignId('productor_id')->nullable()->after('usuario_id')
                ->constrained('usuarios')->restrictOnDelete();

            $table->index('productor_id');
        });

        // Solo se analizan tallos de caña
        Schema::table('escaneos', function (Blueprint $table) {
            $table->renameColumn('area_hoja_px', 'area_tallo_px');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('escaneos', function (Blueprint $table) {
            $table->renameColumn('area_tallo_px', 'area_hoja_px');
        });

        Schema::table('tratamientos', function (Blueprint $table) {
            $table->dropIndex(['productor_id']);
            $table->dropConstrainedForeignId('productor_id');
        });

        $this->cambiarRoles(['laboratorista', 'jefe_laboratorio']);
    }

    /**
     * Postgres guarda el enum como varchar con un check, que ->change() no sabe modificar.
     *
     * @param  list<string>  $roles
     */
    private function cambiarRoles(array $roles): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $lista = collect($roles)->map(fn (string $rol) => "'{$rol}'")->implode(', ');

            DB::statement('alter table usuarios drop constraint usuarios_rol_check');
            DB::statement("alter table usuarios add constraint usuarios_rol_check check (rol in ({$lista}))");

            return;
        }

        Schema::table('usuarios', function (Blueprint $table) use ($roles) {
            $table->enum('rol', $roles)->default('laboratorista')->change();
        });
    }
};
