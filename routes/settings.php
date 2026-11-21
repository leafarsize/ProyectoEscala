<?php

use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    // Solo GET: Route::redirect() registra todos los verbos (incluido QUERY de Laravel 13)
    // y los tipos que genera Wayfinder para ese verbo no compilan
    Route::get('settings', fn () => redirect()->route('profile.edit'));

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});
