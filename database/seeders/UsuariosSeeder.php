<?php

namespace Database\Seeders;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Un usuario de prueba por rol, más uno desactivado.
 * Se puede correr varias veces: actualiza los existentes en lugar de duplicarlos.
 */
class UsuariosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $password = config('escala.seed_password');

        if (blank($password) || mb_strlen($password) < 12) {
            throw new RuntimeException('Define SEED_PASSWORD en .env (mínimo 12 caracteres) antes de correr el seeder.');
        }

        $usuarios = [
            ['jefe@escala.test', 'Jefe de laboratorio', Rol::JefeLaboratorio, true],
            ['laboratorista@escala.test', 'Laboratorista de prueba', Rol::Laboratorista, true],
            ['productor@escala.test', 'Productor de prueba', Rol::Productor, true],
            ['inactivo@escala.test', 'Usuario desactivado', Rol::Laboratorista, false],
        ];

        foreach ($usuarios as [$email, $nombre, $rol, $activo]) {
            User::updateOrCreate(
                ['email' => $email],
                ['name' => $nombre, 'password' => $password, 'rol' => $rol, 'activo' => $activo],
            );
        }
    }
}
