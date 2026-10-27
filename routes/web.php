<?php

use App\Http\Controllers\EscaneoController;
use App\Http\Controllers\TratamientoController;
use Illuminate\Support\Facades\Route;

// Sin página de bienvenida: la raíz lleva al login (con sesión, Fortify redirige al panel)
// Solo GET: Route::redirect registra todos los métodos y Wayfinder genera tipos inválidos
Route::get('/', fn () => to_route('login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Los tres roles escanean (el productor también toma o importa fotos y ve el resultado)
    Route::get('escanear', [EscaneoController::class, 'create'])->name('escaneo.create');
    // Cada análisis ejecuta Python; se limita para no saturar el servidor
    Route::post('escanear', [EscaneoController::class, 'analizar'])
        ->middleware('throttle:20,1')
        ->name('escaneo.analizar');

    // Solo Jefe de laboratorio
    Route::middleware('rol:jefe_laboratorio')->prefix('jefe')->name('jefe.')->group(function () {
        Route::inertia('usuarios', 'jefe/usuarios')->name('usuarios');
    });

    // Laboratorista y Jefe de laboratorio
    Route::middleware('rol:laboratorista,jefe_laboratorio')->prefix('laboratorio')->name('laboratorio.')->group(function () {
        // Historial por tratamiento: cada tratamiento agrupa sus escaneos (el primero lo inicia)
        Route::get('tratamientos', [TratamientoController::class, 'index'])->name('tratamientos.index');
        Route::get('tratamientos/{tratamiento}', [TratamientoController::class, 'show'])->name('tratamientos.show');
        Route::delete('tratamientos/{tratamiento}', [TratamientoController::class, 'destroy'])->name('tratamientos.destroy');
        Route::get('escaneos/{escaneo}/imagen/{tipo}', [EscaneoController::class, 'imagen'])
            ->whereIn('tipo', ['original', 'resaltada'])
            ->name('escaneos.imagen');
    });

    // Solo Productor
    Route::middleware('rol:productor')->prefix('productor')->name('productor.')->group(function () {
        Route::inertia('resultados', 'productor/resultados')->name('resultados');
    });
});

require __DIR__.'/settings.php';
