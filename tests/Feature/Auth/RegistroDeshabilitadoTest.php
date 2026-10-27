<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

/**
 * El registro público está deshabilitado: las cuentas las crea el Jefe de laboratorio.
 */
class RegistroDeshabilitadoTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_funcion_de_registro_esta_apagada()
    {
        $this->assertFalse(Features::enabled(Features::registration()));
    }

    public function test_la_pantalla_de_registro_responde_404()
    {
        $this->get('/register')->assertNotFound();
    }

    public function test_no_se_puede_registrar_enviando_el_formulario()
    {
        $this->post('/register', [
            'name' => 'Intruso',
            'email' => 'intruso@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertNotFound();

        $this->assertGuest();
        $this->assertDatabaseMissing('usuarios', ['email' => 'intruso@example.com']);
    }
}
