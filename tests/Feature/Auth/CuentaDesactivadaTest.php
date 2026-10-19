<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CuentaDesactivadaTest extends TestCase
{
    use RefreshDatabase;

    private const MENSAJE = 'Tu cuenta está desactivada. Contacta al Jefe de laboratorio.';

    public function test_usuario_desactivado_no_puede_iniciar_sesion(): void
    {
        $usuario = User::factory()->inactivo()->create();

        $this->post(route('login.store'), ['email' => $usuario->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => self::MENSAJE]);

        $this->assertGuest();
    }

    public function test_con_contrasena_incorrecta_no_se_revela_que_la_cuenta_esta_desactivada(): void
    {
        $usuario = User::factory()->inactivo()->create();

        $this->post(route('login.store'), ['email' => $usuario->email, 'password' => 'incorrecta'])
            ->assertSessionHasErrors(['email' => __('auth.failed')]);

        $this->assertGuest();
    }

    public function test_usuario_desactivado_con_2fa_tampoco_llega_al_reto(): void
    {
        $usuario = User::factory()->inactivo()->withTwoFactor()->create();

        $this->post(route('login.store'), ['email' => $usuario->email, 'password' => 'password'])
            ->assertSessionHasErrors(['email' => self::MENSAJE]);

        $this->assertGuest();
        $this->assertFalse(session()->has('login.id'));
    }

    public function test_usuario_desactivado_con_sesion_abierta_es_expulsado(): void
    {
        $usuario = User::factory()->create();

        $this->actingAs($usuario)->get(route('dashboard'))->assertOk();

        // El Jefe de laboratorio lo desactiva mientras tiene la sesión abierta
        $usuario->update(['activo' => false]);

        $this->get(route('dashboard'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors(['email' => self::MENSAJE]);

        $this->assertGuest();
    }

    public function test_peticiones_json_de_un_usuario_desactivado_reciben_401(): void
    {
        $usuario = User::factory()->inactivo()->create();

        $this->actingAs($usuario)
            ->postJson(route('escaneo.analizar'))
            ->assertUnauthorized()
            ->assertJson(['message' => self::MENSAJE]);

        $this->assertGuest();
    }

    public function test_se_mantiene_el_rehash_al_iniciar_sesion(): void
    {
        $usuario = User::factory()->create();

        // Hash con más rondas que las de phpunit.xml (BCRYPT_ROUNDS=4). Se escribe directo en la tabla
        // porque el cast "hashed" del modelo rechaza hashes con otra configuración.
        DB::table('usuarios')->where('id', $usuario->id)->update(['password' => Hash::make('password', ['rounds' => 5])]);

        $this->post(route('login.store'), ['email' => $usuario->email, 'password' => 'password']);

        $this->assertAuthenticatedAs($usuario);
        $this->assertStringStartsWith('$2y$04$', $usuario->fresh()->password);
    }
}
