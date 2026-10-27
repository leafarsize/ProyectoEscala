<?php

namespace Tests\Feature;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;
use ValueError;

class VerificarRolTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Rutas que solo existen durante estas pruebas
        Route::middleware(['web', 'auth'])->group(function () {
            Route::get('/_prueba/solo-jefe', fn () => 'ok')->middleware('rol:jefe_laboratorio');
            Route::get('/_prueba/laboratorio', fn () => 'ok')->middleware('rol:laboratorista,jefe_laboratorio');
            Route::get('/_prueba/rol-mal-escrito', fn () => 'ok')->middleware('rol:jefe_laboratorios');
        });
    }

    public function test_usuario_con_el_rol_puede_entrar()
    {
        $jefe = User::factory()->rol(Rol::JefeLaboratorio)->create();

        $this->actingAs($jefe)->get('/_prueba/solo-jefe')->assertOk();
    }

    public function test_usuario_sin_el_rol_recibe_403()
    {
        $laboratorista = User::factory()->rol(Rol::Laboratorista)->create();

        $this->actingAs($laboratorista)->get('/_prueba/solo-jefe')->assertForbidden();
    }

    public function test_puede_entrar_cualquiera_de_varios_roles()
    {
        $this->actingAs(User::factory()->rol(Rol::Laboratorista)->create())
            ->get('/_prueba/laboratorio')->assertOk();

        $this->actingAs(User::factory()->rol(Rol::JefeLaboratorio)->create())
            ->get('/_prueba/laboratorio')->assertOk();

        $this->actingAs(User::factory()->rol(Rol::Productor)->create())
            ->get('/_prueba/laboratorio')->assertForbidden();
    }

    public function test_visitantes_van_al_login_antes_de_revisar_el_rol()
    {
        $this->get('/_prueba/solo-jefe')->assertRedirect(route('login'));
    }

    public function test_un_rol_mal_escrito_en_la_ruta_truena()
    {
        $this->withoutExceptionHandling();
        $this->expectException(ValueError::class);

        $this->actingAs(User::factory()->rol(Rol::JefeLaboratorio)->create())
            ->get('/_prueba/rol-mal-escrito');
    }
}
