<?php

namespace Tests\Feature;

use App\Enums\Rol;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RolesYAccesoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ruta, rol y si debe poder entrar.
     *
     * @return array<string, array{string, Rol, bool}>
     */
    public static function accesos(): array
    {
        return [
            'jefe en /jefe/usuarios' => ['/jefe/usuarios', Rol::JefeLaboratorio, true],
            'laboratorista en /jefe/usuarios' => ['/jefe/usuarios', Rol::Laboratorista, false],
            'productor en /jefe/usuarios' => ['/jefe/usuarios', Rol::Productor, false],

            'jefe en /laboratorio/escaneos' => ['/laboratorio/escaneos', Rol::JefeLaboratorio, true],
            'laboratorista en /laboratorio/escaneos' => ['/laboratorio/escaneos', Rol::Laboratorista, true],
            'productor en /laboratorio/escaneos' => ['/laboratorio/escaneos', Rol::Productor, false],

            'jefe en /productor/resultados' => ['/productor/resultados', Rol::JefeLaboratorio, false],
            'laboratorista en /productor/resultados' => ['/productor/resultados', Rol::Laboratorista, false],
            'productor en /productor/resultados' => ['/productor/resultados', Rol::Productor, true],

            'jefe en /escanear' => ['/escanear', Rol::JefeLaboratorio, true],
            'laboratorista en /escanear' => ['/escanear', Rol::Laboratorista, true],
            'productor en /escanear' => ['/escanear', Rol::Productor, true],
        ];
    }

    #[DataProvider('accesos')]
    public function test_cada_rol_entra_solo_a_sus_rutas(string $ruta, Rol $rol, bool $puedeEntrar): void
    {
        $usuario = User::factory()->rol($rol)->create();

        $respuesta = $this->actingAs($usuario)->get($ruta);

        $puedeEntrar ? $respuesta->assertOk() : $respuesta->assertForbidden();
    }

    public function test_visitantes_van_al_login(): void
    {
        foreach (['/jefe/usuarios', '/laboratorio/escaneos', '/productor/resultados'] as $ruta) {
            $this->get($ruta)->assertRedirect(route('login'));
        }
    }
}
