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
        Schema::create('avances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tratamiento_id')->constrained('tratamientos')->cascadeOnDelete();
            // Autor: solo él puede editar el avance
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('escaneo_id')->nullable()->constrained('escaneos')->nullOnDelete();
            $table->string('titulo')->nullable();
            $table->text('nota')->nullable();
            // Rutas de fotos; la app exige nota o al menos una foto
            $table->jsonb('fotos')->nullable();
            $table->timestamp('editado_at')->nullable();
            $table->timestamps();

            $table->index(['tratamiento_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('avances');
    }
};
