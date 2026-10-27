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
        Schema::create('escaneos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            // NULL = el escaneo solo queda en el historial
            $table->foreignId('tratamiento_id')->nullable()->constrained('tratamientos')->nullOnDelete();
            $table->string('imagen_original');
            $table->string('imagen_resaltada');
            $table->decimal('porcentaje', 5, 2);
            $table->unsignedTinyInteger('nivel');
            // Se guarda tal cual porque los rangos de config/escala.php pueden cambiar
            $table->string('etiqueta', 50);
            $table->unsignedInteger('area_hoja_px');
            $table->unsignedInteger('area_lesion_px');
            $table->timestamps();

            $table->index(['usuario_id', 'created_at']);
            $table->index(['tratamiento_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('escaneos');
    }
};
