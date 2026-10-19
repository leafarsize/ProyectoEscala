<?php

use App\Http\Controllers\EscaneoController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

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
        Route::inertia('escaneos', 'laboratorio/escaneos')->name('escaneos');
    });

    // Solo Productor
    Route::middleware('rol:productor')->prefix('productor')->name('productor.')->group(function () {
        Route::inertia('resultados', 'productor/resultados')->name('resultados');
    });
});

require __DIR__.'/settings.php';
