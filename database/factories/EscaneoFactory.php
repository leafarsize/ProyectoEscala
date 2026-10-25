<?php

namespace Database\Factories;

use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use App\Services\AnalizadorTallo;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Escaneo>
 */
class EscaneoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $porcentaje = fake()->randomFloat(2, 0, 45);
        $areaTallo = fake()->numberBetween(150_000, 450_000);
        $nombre = Str::uuid();

        return [
            'usuario_id' => User::factory(),
            'tratamiento_id' => Tratamiento::factory(),
            'imagen_original' => "escaneos/{$nombre}.png",
            'imagen_resaltada' => "escaneos/{$nombre}-resaltada.jpg",
            'porcentaje' => $porcentaje,
            ...(new AnalizadorTallo)->clasificar($porcentaje),
            'area_tallo_px' => $areaTallo,
            'area_lesion_px' => (int) round($areaTallo * $porcentaje / 100),
        ];
    }
}
