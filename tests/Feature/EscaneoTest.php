<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AnalizadorHoja;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EscaneoTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get(route('escaneo.create'))->assertRedirect(route('login'));
        $this->post(route('escaneo.analizar'))->assertRedirect(route('login'));
    }

    public function test_scan_page_is_displayed_with_severity_levels()
    {
        $this->actingAs(User::factory()->create())
            ->get(route('escaneo.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('escanear')
                ->has('niveles', 6)
                ->where('maxKb', 10240));
    }

    public function test_leaf_is_analyzed_and_classified()
    {
        Process::fake([
            '*' => Process::result(output: json_encode([
                'porcentaje' => 14.14,
                'area_hoja_px' => 184656,
                'area_lesion_px' => 26109,
                'imagen_resaltada' => 'data:image/jpeg;base64,AAAA',
            ])),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('hoja.png', 800, 400),
            ])
            ->assertOk()
            ->assertExactJson([
                'porcentaje' => 14.14,
                'nivel' => 3,
                'etiqueta' => 'Moderado alto',
                'area_hoja_px' => 184656,
                'area_lesion_px' => 26109,
                'imagen_resaltada' => 'data:image/jpeg;base64,AAAA',
            ]);

        Process::assertRan(fn ($process) => in_array(config('escala.script'), $process->command, true));
    }

    public function test_photo_problems_are_returned_as_validation_errors()
    {
        Process::fake([
            '*' => Process::result(
                output: json_encode(['error' => 'No se detectó la hoja, toma la foto de nuevo.']),
                exitCode: 2,
            ),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('hoja.png'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['imagen' => 'No se detectó la hoja, toma la foto de nuevo.']);
    }

    public function test_python_failures_return_service_unavailable()
    {
        Process::fake([
            '*' => Process::result(errorOutput: 'ModuleNotFoundError: No module named cv2', exitCode: 1),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('hoja.png'),
            ])
            ->assertServiceUnavailable();
    }

    public function test_image_is_required_and_must_be_a_valid_format()
    {
        Process::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'))
            ->assertJsonValidationErrors(['imagen' => 'Toma o importa una foto de la hoja.']);

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->create('hoja.pdf', 100, 'application/pdf'),
            ])
            ->assertJsonValidationErrors(['imagen' => 'Formato no válido. Usa una imagen JPG, PNG o WEBP.']);

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('hoja.png')->size(10241),
            ])
            ->assertJsonValidationErrors(['imagen' => 'La imagen supera el tamaño máximo de 10 MB.']);

        Process::assertNothingRan();
    }

    public function test_severity_levels_follow_the_configured_ranges()
    {
        $analizador = new AnalizadorHoja;

        $this->assertSame(['nivel' => 0, 'etiqueta' => 'Sano'], $analizador->clasificar(0));
        $this->assertSame(['nivel' => 1, 'etiqueta' => 'Leve'], $analizador->clasificar(1));
        $this->assertSame(['nivel' => 2, 'etiqueta' => 'Moderado bajo'], $analizador->clasificar(9.99));
        $this->assertSame(['nivel' => 3, 'etiqueta' => 'Moderado alto'], $analizador->clasificar(10));
        $this->assertSame(['nivel' => 4, 'etiqueta' => 'Severo'], $analizador->clasificar(49.9));
        $this->assertSame(['nivel' => 5, 'etiqueta' => 'Muy severo'], $analizador->clasificar(100));
    }

    /**
     * Ejecuta el script real de Python con una hoja dibujada: verde con manchas café.
     */
    public function test_python_script_measures_damage_on_a_drawn_leaf()
    {
        if (! Process::run([config('escala.python'), '-c', 'import cv2'])->successful()) {
            $this->markTestSkipped('Python con OpenCV no está instalado (ver python/requirements.txt).');
        }

        $img = imagecreatetruecolor(800, 400);
        imagefill($img, 0, 0, imagecolorallocate($img, 240, 240, 240));
        imagefilledellipse($img, 400, 200, 700, 200, imagecolorallocate($img, 70, 150, 40));
        $cafe = imagecolorallocate($img, 150, 80, 30);
        foreach ([[250, 180], [400, 220], [550, 190]] as [$x, $y]) {
            imagefilledellipse($img, $x, $y, 60, 40, $cafe);
        }

        $ruta = tempnam(sys_get_temp_dir(), 'hoja').'.png';
        imagepng($img, $ruta);

        try {
            $resultado = (new AnalizadorHoja)->analizar($ruta);
        } finally {
            unlink($ruta);
        }

        // 3 manchas de 60x40 sobre una hoja de 700x200 ≈ 5.1 %
        $this->assertEqualsWithDelta(5.1, $resultado['porcentaje'], 0.5);
        $this->assertSame(2, $resultado['nivel']);
        $this->assertStringStartsWith('data:image/jpeg;base64,', $resultado['imagen_resaltada']);
    }
}
