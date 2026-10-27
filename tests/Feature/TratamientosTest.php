<?php

namespace Tests\Feature;

use App\Enums\Rol;
use App\Models\AccesoTratamiento;
use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TratamientosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    private function fingirAnalisis(float $porcentaje = 21.47): void
    {
        Process::fake([
            '*' => Process::result(output: json_encode([
                'porcentaje' => $porcentaje,
                'area_tallo_px' => 431403,
                'area_lesion_px' => 92622,
                'imagen_resaltada' => 'data:image/jpeg;base64,'.base64_encode('jpg-resaltada'),
            ])),
        ]);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    private function escanear(User $usuario, array $datos = []): TestResponse
    {
        return $this->actingAs($usuario)->postJson(route('escaneo.analizar'), [
            'imagen' => UploadedFile::fake()->image('tallo.png', 400, 900),
            ...$datos,
        ]);
    }

    private function darAcceso(Tratamiento $tratamiento, User $invitado, string $expira = '+1 day'): void
    {
        AccesoTratamiento::create([
            'tratamiento_id' => $tratamiento->id,
            'usuario_id' => $invitado->id,
            'otorgado_por' => $tratamiento->usuario_id,
            'expira_at' => now()->modify($expira),
        ]);
    }

    // ---------- Escanear: cada escaneo pertenece a un tratamiento ----------

    public function test_el_primer_escaneo_inicia_un_tratamiento_nuevo()
    {
        $this->fingirAnalisis();
        $laboratorista = User::factory()->create();
        $productor = User::factory()->rol(Rol::Productor)->create();

        $this->escanear($laboratorista, [
            'nombre' => 'Ensayo Fusarium', 'variedad' => 'CP 72-2086', 'lote' => 'Lote 3', 'productor_id' => $productor->id,
        ])
            ->assertOk()
            ->assertJsonPath('tratamiento.nombre', 'Ensayo Fusarium')
            ->assertJsonPath('tratamiento.escaneos', 1);

        $tratamiento = Tratamiento::sole();
        $this->assertSame($laboratorista->id, $tratamiento->usuario_id);
        $this->assertSame($productor->id, $tratamiento->productor_id);
        $this->assertSame('CP 72-2086', $tratamiento->variedad);
        $this->assertSame('Lote 3', $tratamiento->lote);
        $this->assertTrue($tratamiento->estaAbierto());
        $this->assertTrue($tratamiento->fecha_inicio->isToday());

        $escaneo = Escaneo::sole();
        $this->assertSame($tratamiento->id, $escaneo->tratamiento_id);
        $this->assertSame(21.47, $escaneo->porcentaje);
        $this->assertSame(3, $escaneo->nivel);
        Storage::disk('local')->assertExists($escaneo->imagen_original);
        $this->assertSame('jpg-resaltada', Storage::disk('local')->get($escaneo->imagen_resaltada));
    }

    public function test_un_tratamiento_puede_tener_n_escaneos()
    {
        $this->fingirAnalisis(12.5);
        $laboratorista = User::factory()->create();
        $tratamiento = Tratamiento::factory()->for($laboratorista, 'usuario')->create();
        Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')->count(2)->create();

        $this->escanear($laboratorista, ['tratamiento_id' => $tratamiento->id])
            ->assertOk()
            ->assertJsonPath('tratamiento.id', $tratamiento->id)
            ->assertJsonPath('tratamiento.escaneos', 3);

        $this->assertSame(1, Tratamiento::count());
        $this->assertSame(3, $tratamiento->escaneos()->count());
    }

    public function test_sin_tratamiento_hay_que_dar_sus_datos()
    {
        $this->fingirAnalisis();

        $this->escanear(User::factory()->create())
            ->assertJsonValidationErrors([
                'nombre' => 'Escribe el nombre del tratamiento.',
                'variedad' => 'Escribe la variedad de caña.',
                'lote' => 'Escribe el lote o parcela.',
            ]);

        Process::assertNothingRan();
        $this->assertSame(0, Escaneo::count());
    }

    public function test_un_tratamiento_cerrado_no_admite_escaneos()
    {
        $this->fingirAnalisis();
        $laboratorista = User::factory()->create();
        $tratamiento = Tratamiento::factory()->cerrado()->for($laboratorista, 'usuario')->create();

        $this->escanear($laboratorista, ['tratamiento_id' => $tratamiento->id])
            ->assertJsonValidationErrors(['tratamiento_id' => 'El tratamiento está cerrado; ya no admite escaneos.']);

        Process::assertNothingRan();
    }

    public function test_no_se_puede_escanear_en_un_tratamiento_ajeno_sin_acceso()
    {
        $this->fingirAnalisis();
        $ajeno = Tratamiento::factory()->create();

        $this->escanear(User::factory()->create(), ['tratamiento_id' => $ajeno->id])->assertForbidden();

        Process::assertNothingRan();
    }

    public function test_con_acceso_vigente_si_se_puede_escanear_en_un_tratamiento_ajeno()
    {
        $this->fingirAnalisis();
        $invitado = User::factory()->create();
        $tratamiento = Tratamiento::factory()->create();
        $this->darAcceso($tratamiento, $invitado);

        $this->escanear($invitado, ['tratamiento_id' => $tratamiento->id])->assertOk();

        $this->assertSame($invitado->id, Escaneo::sole()->usuario_id);
    }

    public function test_con_acceso_vencido_no_se_puede_escanear()
    {
        $this->fingirAnalisis();
        $invitado = User::factory()->create();
        $tratamiento = Tratamiento::factory()->create();
        $this->darAcceso($tratamiento, $invitado, '-1 hour');

        $this->escanear($invitado, ['tratamiento_id' => $tratamiento->id])->assertForbidden();
    }

    public function test_el_jefe_puede_escanear_en_cualquier_tratamiento()
    {
        $this->fingirAnalisis();

        $this->escanear(User::factory()->rol(Rol::JefeLaboratorio)->create(), [
            'tratamiento_id' => Tratamiento::factory()->create()->id,
        ])->assertOk();
    }

    public function test_el_analisis_del_productor_no_se_guarda()
    {
        $this->fingirAnalisis();

        $this->escanear(User::factory()->rol(Rol::Productor)->create(), ['nombre' => 'Ignorado'])
            ->assertOk()
            ->assertJsonPath('porcentaje', 21.47)
            ->assertJsonPath('tratamiento', null);

        $this->assertSame(0, Tratamiento::count());
        $this->assertSame(0, Escaneo::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_una_foto_rechazada_no_crea_tratamiento_ni_escaneo()
    {
        Process::fake([
            '*' => Process::result(output: json_encode(['error' => 'La foto está desenfocada.']), exitCode: 2),
        ]);

        $this->escanear(User::factory()->create(), ['nombre' => 'E', 'variedad' => 'V', 'lote' => 'L'])
            ->assertJsonValidationErrors(['imagen' => 'La foto está desenfocada.']);

        $this->assertSame(0, Tratamiento::count());
        $this->assertSame(0, Escaneo::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_la_pantalla_de_escaneo_ofrece_los_tratamientos_abiertos_visibles()
    {
        $laboratorista = User::factory()->create();
        $propio = Tratamiento::factory()->for($laboratorista, 'usuario')->create(['nombre' => 'Propio']);
        Tratamiento::factory()->cerrado()->for($laboratorista, 'usuario')->create();
        Tratamiento::factory()->create(); // ajeno
        User::factory()->rol(Rol::Productor)->create(['name' => 'Don Productor']);

        $this->actingAs($laboratorista)
            ->get(route('escaneo.create', ['tratamiento' => $propio->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('puedeGuardar', true)
                ->has('tratamientos', 1)
                ->where('tratamientos.0.nombre', 'Propio')
                ->where('tratamientoInicial', $propio->id)
                ->where('productores.0.name', 'Don Productor'));
    }

    // ---------- Historial por tratamiento ----------

    public function test_el_historial_lista_tratamientos_con_su_evolucion()
    {
        $laboratorista = User::factory()->create();
        $tratamiento = Tratamiento::factory()->for($laboratorista, 'usuario')->create(['nombre' => 'Ensayo A']);
        Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')
            ->create(['porcentaje' => 30.5, 'created_at' => now()->subDays(7)]);
        $ultimo = Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')
            ->create(['porcentaje' => 4.2, 'nivel' => 1, 'etiqueta' => 'Leve']);

        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('laboratorio/tratamientos/index')
                ->where('tratamientos.total', 1)
                ->where('tratamientos.data.0.nombre', 'Ensayo A')
                ->where('tratamientos.data.0.escaneos', 2)
                ->where('tratamientos.data.0.porcentaje_inicial', 30.5)
                ->where('tratamientos.data.0.ultimo.id', $ultimo->id)
                ->where('tratamientos.data.0.ultimo.porcentaje', 4.2)
                ->where('tratamientos.data.0.estado', 'abierto'));
    }

    public function test_el_laboratorista_ve_sus_tratamientos_y_los_que_tiene_con_acceso_vigente()
    {
        $laboratorista = User::factory()->create();
        Tratamiento::factory()->for($laboratorista, 'usuario')->create(['nombre' => 'Propio']);
        $invitado = Tratamiento::factory()->create(['nombre' => 'Invitado']);
        $vencido = Tratamiento::factory()->create(['nombre' => 'Vencido']);
        Tratamiento::factory()->create(['nombre' => 'Ajeno']);
        $this->darAcceso($invitado, $laboratorista);
        $this->darAcceso($vencido, $laboratorista, '-1 day');

        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tratamientos.total', 2)
                ->where('tratamientos.data', fn ($data) => collect($data)->pluck('nombre')->sort()->values()->all() === ['Invitado', 'Propio']));
    }

    public function test_el_jefe_ve_todos_los_tratamientos()
    {
        Tratamiento::factory()->count(3)->create();

        $this->actingAs(User::factory()->rol(Rol::JefeLaboratorio)->create())
            ->get(route('laboratorio.tratamientos.index'))
            ->assertInertia(fn (Assert $page) => $page->where('tratamientos.total', 3));
    }

    public function test_el_historial_se_pagina_de_12_en_12()
    {
        Tratamiento::factory()->count(13)->create();

        $this->actingAs(User::factory()->rol(Rol::JefeLaboratorio)->create())
            ->get(route('laboratorio.tratamientos.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('tratamientos.data', 1)
                ->where('tratamientos.current_page', 2)
                ->where('tratamientos.last_page', 2));
    }

    public function test_el_detalle_muestra_los_escaneos_del_primero_al_ultimo()
    {
        $laboratorista = User::factory()->create(['name' => 'Ana']);
        $productor = User::factory()->rol(Rol::Productor)->create(['name' => 'Don Productor']);
        $tratamiento = Tratamiento::factory()->for($laboratorista, 'usuario')->create(['productor_id' => $productor->id]);
        $segundo = Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')->create(['created_at' => now()->subDay()]);
        $primero = Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')->create(['created_at' => now()->subDays(5)]);
        $tercero = Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')->create();

        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.show', $tratamiento))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('laboratorio/tratamientos/show')
                ->where('tratamiento.id', $tratamiento->id)
                ->where('tratamiento.responsable', 'Ana')
                ->where('tratamiento.productor', 'Don Productor')
                ->where('tratamiento.puede_agregar', true)
                ->has('escaneos', 3)
                ->where('escaneos.0.id', $primero->id)
                ->where('escaneos.1.id', $segundo->id)
                ->where('escaneos.2.id', $tercero->id)
                ->where('escaneos.0.imagen_original', $primero->urlImagen('original')));
    }

    public function test_en_un_tratamiento_cerrado_no_se_ofrece_agregar_escaneos()
    {
        $laboratorista = User::factory()->create();
        $tratamiento = Tratamiento::factory()->cerrado()->for($laboratorista, 'usuario')->create();

        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.show', $tratamiento))
            ->assertInertia(fn (Assert $page) => $page->where('tratamiento.puede_agregar', false));
    }

    public function test_un_laboratorista_no_ve_el_detalle_de_un_tratamiento_ajeno()
    {
        $this->actingAs(User::factory()->create())
            ->get(route('laboratorio.tratamientos.show', Tratamiento::factory()->create()))
            ->assertForbidden();
    }

    public function test_el_productor_no_entra_al_historial()
    {
        $productor = User::factory()->rol(Rol::Productor)->create();

        $this->actingAs($productor)->get(route('laboratorio.tratamientos.index'))->assertForbidden();
        $this->actingAs($productor)
            ->get(route('laboratorio.tratamientos.show', Tratamiento::factory()->create()))
            ->assertForbidden();
    }

    // ---------- Imágenes ----------

    public function test_las_imagenes_las_ve_quien_puede_ver_el_tratamiento()
    {
        $dueno = User::factory()->create();
        $escaneo = Escaneo::factory()->for(Tratamiento::factory()->for($dueno, 'usuario'))->create();
        Storage::disk('local')->put($escaneo->imagen_original, 'png-original');
        Storage::disk('local')->put($escaneo->imagen_resaltada, 'jpg-resaltada');

        foreach ([$dueno, User::factory()->rol(Rol::JefeLaboratorio)->create()] as $usuario) {
            $respuesta = $this->actingAs($usuario)->get(route('laboratorio.escaneos.imagen', [$escaneo, 'resaltada']));
            $respuesta->assertOk();
            $this->assertSame('jpg-resaltada', $respuesta->streamedContent());
        }

        $this->actingAs(User::factory()->create())
            ->get(route('laboratorio.escaneos.imagen', [$escaneo, 'original']))
            ->assertForbidden();
        $this->actingAs(User::factory()->rol(Rol::Productor)->create())
            ->get(route('laboratorio.escaneos.imagen', [$escaneo, 'original']))
            ->assertForbidden();
    }

    public function test_tipo_de_imagen_invalido_o_archivo_inexistente_da_404()
    {
        $dueno = User::factory()->create();
        $escaneo = Escaneo::factory()->for(Tratamiento::factory()->for($dueno, 'usuario'))->create();

        $this->actingAs($dueno)->get("/laboratorio/escaneos/{$escaneo->id}/imagen/otra")->assertNotFound();
        $this->actingAs($dueno)->get(route('laboratorio.escaneos.imagen', [$escaneo, 'original']))->assertNotFound();
    }

    // ---------- Eliminar ----------

    public function test_el_dueno_elimina_su_tratamiento_con_escaneos_e_imagenes()
    {
        $laboratorista = User::factory()->create();
        $tratamiento = Tratamiento::factory()->for($laboratorista, 'usuario')->create();
        $escaneo = Escaneo::factory()->for($tratamiento)->for($laboratorista, 'usuario')->create();
        Storage::disk('local')->put($escaneo->imagen_original, 'png');
        Storage::disk('local')->put($escaneo->imagen_resaltada, 'jpg');
        $this->darAcceso($tratamiento, User::factory()->create());

        $this->actingAs($laboratorista)
            ->delete(route('laboratorio.tratamientos.destroy', $tratamiento))
            ->assertRedirect(route('laboratorio.tratamientos.index'));

        $this->assertDatabaseMissing('tratamientos', ['id' => $tratamiento->id]);
        $this->assertSame(0, Escaneo::count());
        $this->assertDatabaseEmpty('accesos_tratamiento');
        Storage::disk('local')->assertMissing($escaneo->imagen_original);
        Storage::disk('local')->assertMissing($escaneo->imagen_resaltada);
    }

    public function test_el_jefe_puede_eliminar_cualquier_tratamiento()
    {
        $tratamiento = Tratamiento::factory()->create();

        $this->actingAs(User::factory()->rol(Rol::JefeLaboratorio)->create())
            ->delete(route('laboratorio.tratamientos.destroy', $tratamiento))
            ->assertRedirect(route('laboratorio.tratamientos.index'));

        $this->assertDatabaseMissing('tratamientos', ['id' => $tratamiento->id]);
    }

    public function test_un_laboratorista_no_elimina_un_tratamiento_ajeno_ni_con_acceso()
    {
        $invitado = User::factory()->create();
        $tratamiento = Tratamiento::factory()->create();
        $this->darAcceso($tratamiento, $invitado);

        $this->actingAs($invitado)
            ->delete(route('laboratorio.tratamientos.destroy', $tratamiento))
            ->assertForbidden();

        $this->assertDatabaseHas('tratamientos', ['id' => $tratamiento->id]);
    }

    public function test_el_productor_no_puede_eliminar_tratamientos()
    {
        $tratamiento = Tratamiento::factory()->create();

        $this->actingAs(User::factory()->rol(Rol::Productor)->create())
            ->delete(route('laboratorio.tratamientos.destroy', $tratamiento))
            ->assertForbidden();

        $this->assertDatabaseHas('tratamientos', ['id' => $tratamiento->id]);
    }

    public function test_el_detalle_dice_si_se_puede_eliminar()
    {
        $laboratorista = User::factory()->create();
        $propio = Tratamiento::factory()->for($laboratorista, 'usuario')->create();
        $invitado = Tratamiento::factory()->create();
        $this->darAcceso($invitado, $laboratorista);

        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.show', $propio))
            ->assertInertia(fn (Assert $page) => $page->where('tratamiento.puede_eliminar', true));

        // Con acceso vigente puede verlo, pero no eliminarlo
        $this->actingAs($laboratorista)
            ->get(route('laboratorio.tratamientos.show', $invitado))
            ->assertInertia(fn (Assert $page) => $page->where('tratamiento.puede_eliminar', false));
    }
}
