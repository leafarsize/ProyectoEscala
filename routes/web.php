<?php

use App\Http\Controllers\EscaneoController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('escanear', [EscaneoController::class, 'create'])->name('escaneo.create');
    // Cada análisis ejecuta Python; se limita para no saturar el servidor
    Route::post('escanear', [EscaneoController::class, 'analizar'])
        ->middleware('throttle:20,1')
        ->name('escaneo.analizar');
});

require __DIR__.'/settings.php';
