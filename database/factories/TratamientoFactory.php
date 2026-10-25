<?php

namespace Database\Factories;

use App\Models\Tratamiento;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tratamiento>
 */
class TratamientoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'usuario_id' => User::factory(),
            'nombre' => 'Ensayo '.fake()->unique()->numberBetween(1, 9999),
            'variedad' => fake()->randomElement(['CP 72-2086', 'Mex 69-290', 'ITV 92-1424']),
            'lote' => 'Lote '.fake()->numberBetween(1, 40),
            'fecha_inicio' => now()->toDateString(),
            'estado' => Tratamiento::ABIERTO,
        ];
    }

    public function cerrado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => Tratamiento::CERRADO,
            'cerrado_at' => now(),
        ]);
    }
}
