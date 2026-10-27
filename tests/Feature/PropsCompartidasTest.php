<?php

namespace Tests\Feature;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropsCompartidasTest extends TestCase
{
    use RefreshDatabase;

    public function test_react_recibe_solo_los_datos_necesarios_del_usuario(): void
    {
        $usuario = User::factory()->rol(Rol::JefeLaboratorio)->create();

        $this->actingAs($usuario)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user', [
                    'id' => $usuario->id,
                    'name' => $usuario->name,
                    'email' => $usuario->email,
                    'rol' => 'jefe_laboratorio',
                    'rol_etiqueta' => 'Jefe de laboratorio',
                ]));
    }

    public function test_los_visitantes_reciben_usuario_nulo(): void
    {
        $this->get(route('login'))
            ->assertInertia(fn (Assert $page) => $page->where('auth.user', null));
    }
}
