<?php

namespace Tests\Feature\Settings;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_settings_redirects_to_the_profile_page()
    {
        $this->actingAs(User::factory()->create())
            ->get('/settings')
            ->assertRedirect(route('profile.edit'));
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_un_usuario_no_puede_cambiarse_el_rol_ni_el_estado_desde_su_perfil()
    {
        $user = User::factory()->inactivo()->create();

        $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'rol' => Rol::JefeLaboratorio->value,
                'activo' => true,
            ]);

        $user->refresh();

        $this->assertSame(Rol::Laboratorista, $user->rol);
        $this->assertFalse($user->activo);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    /**
     * Las cuentas las administra el Jefe de laboratorio: nadie borra la suya.
     */
    public function test_el_usuario_ya_no_puede_borrar_su_propia_cuenta()
    {
        $user = User::factory()->create();

        // 405 y no 404: la dirección sigue existiendo para ver y guardar el perfil,
        // pero ya no acepta DELETE
        $this->actingAs($user)
            ->delete('/settings/profile', ['password' => 'password'])
            ->assertMethodNotAllowed();

        $this->assertFalse(Route::has('profile.destroy'));
        $this->assertNotNull($user->fresh());
        $this->assertAuthenticated();
    }
}
