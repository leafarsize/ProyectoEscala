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
        Schema::create('tratamientos', function (Blueprint $table) {
            $table->id();
            // Dueño: quien creó el tratamiento
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('nombre');
            $table->string('variedad', 100);
            $table->string('lote', 100);
            $table->date('fecha_inicio');
            $table->text('condiciones')->nullable();
            $table->text('notas')->nullable();
            // Rutas de fotos y documentos (JPG, PNG, PDF)
            $table->jsonb('adjuntos')->nullable();
            $table->enum('estado', ['abierto', 'cerrado'])->default('abierto');
            $table->timestamp('cerrado_at')->nullable();
            $table->timestamps();

            $table->index(['usuario_id', 'estado']);
            $table->index('variedad');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tratamientos');
    }
};
