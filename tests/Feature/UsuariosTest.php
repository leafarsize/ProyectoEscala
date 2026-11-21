<?php

namespace Tests\Feature;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * El Jefe de laboratorio administra las contraseñas desde el CRUD de usuarios:
 * ya no hay recuperación por correo ni cambio desde el perfil.
 */
class UsuariosTest extends TestCase
{
    use RefreshDatabase;

    private function jefe(): User
    {
        return User::factory()->rol(Rol::JefeLaboratorio)->create();
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function datos(User $usuario, array $extra = []): array
    {
        return [
            'name' => $usuario->name,
            'email' => $usuario->email,
            'rol' => $usuario->rol->value,
            'activo' => '1',
            ...$extra,
        ];
    }

    // ---------- El Jefe asigna la contraseña ----------

    public function test_el_jefe_le_asigna_una_contrasena_nueva_a_un_usuario()
    {
        $jefe = $this->jefe();
        $usuario = User::factory()->create(['password' => 'ContrasenaVieja#1']);

        $this->actingAs($jefe)
            ->put(route('jefe.usuarios.update', $usuario->id), $this->datos($usuario, [
                'password' => 'ContrasenaNueva#2',
                'password_confirmation' => 'ContrasenaNueva#2',
            ]))
            ->assertRedirect(route('jefe.usuarios.index'));

        $this->assertTrue(Hash::check('ContrasenaNueva#2', $usuario->fresh()->password));
    }

    public function test_si_deja_la_contrasena_vacia_no_se_cambia()
    {
        $jefe = $this->jefe();
        $usuario = User::factory()->create(['password' => 'ContrasenaVieja#1']);

        $this->actingAs($jefe)
            ->put(route('jefe.usuarios.update', $usuario->id), $this->datos($usuario, [
                'name' => 'Nombre Cambiado',
                'password' => '',
                'password_confirmation' => '',
            ]))
            ->assertRedirect(route('jefe.usuarios.index'));

        $usuario = $usuario->fresh();
        $this->assertSame('Nombre Cambiado', $usuario->name);
        $this->assertTrue(Hash::check('ContrasenaVieja#1', $usuario->password));
    }

    public function test_las_dos_contrasenas_deben_coincidir()
    {
        $jefe = $this->jefe();
        $usuario = User::factory()->create(['password' => 'ContrasenaVieja#1']);

        $this->actingAs($jefe)
            ->put(route('jefe.usuarios.update', $usuario->id), $this->datos($usuario, [
                'password' => 'ContrasenaNueva#2',
                'password_confirmation' => 'OtraDistinta#3',
            ]))
            ->assertSessionHasErrors(['password' => 'Las dos contraseñas no coinciden.']);

        $this->assertTrue(Hash::check('ContrasenaVieja#1', $usuario->fresh()->password));
    }

    public function test_el_jefe_puede_cambiar_la_contrasena_de_su_propia_cuenta()
    {
        $jefe = $this->jefe();

        // En su propia cuenta el formulario no envía rol ni estado
        $this->actingAs($jefe)
            ->put(route('jefe.usuarios.update', $jefe->id), [
                'name' => $jefe->name,
                'email' => $jefe->email,
                'password' => 'MiContrasenaNueva#4',
                'password_confirmation' => 'MiContrasenaNueva#4',
            ])
            ->assertRedirect(route('jefe.usuarios.index'));

        $this->assertTrue(Hash::check('MiContrasenaNueva#4', $jefe->fresh()->password));
    }

    public function test_el_laboratorista_no_puede_cambiar_contrasenas_de_nadie()
    {
        $laboratorista = User::factory()->rol(Rol::Laboratorista)->create();
        $otro = User::factory()->create(['password' => 'ContrasenaVieja#1']);

        $this->actingAs($laboratorista)
            ->put(route('jefe.usuarios.update', $otro->id), $this->datos($otro, [
                'password' => 'ContrasenaNueva#2',
                'password_confirmation' => 'ContrasenaNueva#2',
            ]))
            ->assertForbidden();

        $this->assertTrue(Hash::check('ContrasenaVieja#1', $otro->fresh()->password));
    }

    // ---------- Ya no hay autoservicio de contraseña ----------

    public function test_el_login_ya_no_ofrece_recuperar_la_contrasena()
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('Iniciar sesión')
            ->assertDontSee('Olvidaste tu contraseña', escape: false);
    }

    public function test_las_rutas_de_recuperacion_por_correo_ya_no_existen()
    {
        $this->get('/forgot-password')->assertNotFound();
        $this->post('/forgot-password', ['email' => 'quien@sea.com'])->assertNotFound();
        $this->get('/reset-password/token-cualquiera')->assertNotFound();
    }

    public function test_la_configuracion_del_perfil_ya_no_tiene_seguridad()
    {
        $usuario = User::factory()->create();

        $this->actingAs($usuario)->get('/settings/security')->assertNotFound();
        $this->actingAs($usuario)->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'ContrasenaNueva#2',
            'password_confirmation' => 'ContrasenaNueva#2',
        ])->assertNotFound();
    }
}
