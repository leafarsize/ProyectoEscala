<?php

namespace Tests\Feature;

use App\Exceptions\FotoNoValida;
use App\Models\User;
use App\Services\AnalizadorTallo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EscaneoTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitantes_van_al_login()
    {
        $this->get(route('escaneo.create'))->assertRedirect(route('login'));
        $this->post(route('escaneo.analizar'))->assertRedirect(route('login'));
    }

    public function test_la_pantalla_de_escaneo_muestra_los_niveles_de_severidad()
    {
        $this->actingAs(User::factory()->create())
            ->get(route('escaneo.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('escanear')
                ->has('niveles', 6)
                ->where('maxKb', 10240));
    }

    public function test_el_tallo_se_analiza_y_clasifica()
    {
        Process::fake([
            '*' => Process::result(output: json_encode([
                'porcentaje' => 14.14,
                'area_tallo_px' => 184656,
                'area_lesion_px' => 26109,
                'imagen_resaltada' => 'data:image/jpeg;base64,AAAA',
            ])),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('tallo.png', 800, 400),
            ])
            ->assertOk()
            ->assertExactJson([
                'porcentaje' => 14.14,
                'nivel' => 2,
                'etiqueta' => 'Moderado bajo',
                'area_tallo_px' => 184656,
                'area_lesion_px' => 26109,
                'imagen_resaltada' => 'data:image/jpeg;base64,AAAA',
            ]);

        Process::assertRan(fn ($process) => in_array(config('escala.script'), $process->command, true));
    }

    public function test_los_problemas_de_la_foto_se_devuelven_como_errores_de_validacion()
    {
        Process::fake([
            '*' => Process::result(
                output: json_encode(['error' => 'No se detectó el tallo, toma la foto de nuevo.']),
                exitCode: 2,
            ),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('tallo.png'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['imagen' => 'No se detectó el tallo, toma la foto de nuevo.']);
    }

    public function test_si_python_falla_responde_servicio_no_disponible()
    {
        Process::fake([
            '*' => Process::result(errorOutput: 'ModuleNotFoundError: No module named cv2', exitCode: 1),
        ]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('tallo.png'),
            ])
            ->assertServiceUnavailable();
    }

    public function test_la_imagen_es_obligatoria_y_debe_tener_formato_valido()
    {
        Process::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'))
            ->assertJsonValidationErrors(['imagen' => 'Toma o importa una foto del tallo.']);

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->create('tallo.pdf', 100, 'application/pdf'),
            ])
            ->assertJsonValidationErrors(['imagen' => 'Formato no válido. Usa una imagen JPG, PNG o WEBP.']);

        $this->actingAs($user)
            ->postJson(route('escaneo.analizar'), [
                'imagen' => UploadedFile::fake()->image('tallo.png')->size(10241),
            ])
            ->assertJsonValidationErrors(['imagen' => 'La imagen supera el tamaño máximo de 10 MB.']);

        Process::assertNothingRan();
    }

    public function test_los_niveles_de_severidad_siguen_los_rangos_configurados()
    {
        $analizador = new AnalizadorTallo;

        $this->assertSame(['nivel' => 0, 'etiqueta' => 'Sano'], $analizador->clasificar(0));
        $this->assertSame(['nivel' => 0, 'etiqueta' => 'Sano'], $analizador->clasificar(3.49));
        $this->assertSame(['nivel' => 1, 'etiqueta' => 'Leve'], $analizador->clasificar(3.5));
        $this->assertSame(['nivel' => 2, 'etiqueta' => 'Moderado bajo'], $analizador->clasificar(9));
        $this->assertSame(['nivel' => 3, 'etiqueta' => 'Moderado alto'], $analizador->clasificar(18));
        $this->assertSame(['nivel' => 4, 'etiqueta' => 'Severo'], $analizador->clasificar(35.99));
        $this->assertSame(['nivel' => 5, 'etiqueta' => 'Muy severo'], $analizador->clasificar(36));
        $this->assertSame(['nivel' => 5, 'etiqueta' => 'Muy severo'], $analizador->clasificar(100));
    }

    public function test_los_valores_representativos_de_la_escala_de_natalia_caen_en_su_nivel()
    {
        $analizador = new AnalizadorTallo;

        // Escala diagramática de la tesis (Fig. 7.1): nivel => % representativo
        foreach ([0 => 0, 1 => 7, 2 => 11, 3 => 18, 4 => 28, 5 => 44] as $nivel => $porcentaje) {
            $this->assertSame($nivel, $analizador->clasificar($porcentaje)['nivel']);
        }
    }

    /**
     * Ejecuta el script real de Python con un tallo dibujado: color crema con manchas rojizas.
     */
    public function test_el_script_de_python_mide_el_dano_en_un_tallo_dibujado()
    {
        if (! Process::run([config('escala.python'), '-c', 'import cv2'])->successful()) {
            $this->markTestSkipped('Python con OpenCV no está instalado (ver python/requirements.txt).');
        }

        $img = imagecreatetruecolor(800, 400);
        imagefill($img, 0, 0, imagecolorallocate($img, 240, 240, 240));
        imagefilledellipse($img, 400, 200, 700, 200, imagecolorallocate($img, 215, 195, 140));
        $rojizo = imagecolorallocate($img, 150, 60, 40);
        foreach ([[250, 180], [400, 220], [550, 190]] as [$x, $y]) {
            imagefilledellipse($img, $x, $y, 60, 40, $rojizo);
        }

        $ruta = tempnam(sys_get_temp_dir(), 'tallo').'.png';
        imagepng($img, $ruta);

        try {
            $resultado = (new AnalizadorTallo)->analizar($ruta);
        } finally {
            unlink($ruta);
        }

        // 3 manchas de 60x40 sobre un tallo de 700x200 ≈ 5.1 %
        $this->assertEqualsWithDelta(5.1, $resultado['porcentaje'], 0.5);
        $this->assertSame(1, $resultado['nivel']);
        $this->assertStringStartsWith('data:image/jpeg;base64,', $resultado['imagen_resaltada']);
    }

    /**
     * Como las imágenes de referencia de Natalia: corte del tallo en PNG con fondo transparente.
     */
    public function test_el_script_de_python_analiza_un_png_con_fondo_transparente()
    {
        $this->saltarSinPython();

        $ruta = $this->corteTransparente(conLesion: true);

        try {
            $resultado = (new AnalizadorTallo)->analizar($ruta);
        } finally {
            unlink($ruta);
        }

        // Lesión (con halo) elíptica de 120x160 sobre un corte de 300x900: π·60·80 / 270000 ≈ 5.6 %
        $this->assertEqualsWithDelta(5.6, $resultado['porcentaje'], 1.0);
        $this->assertSame(1, $resultado['nivel']);
    }

    /**
     * El método anterior (Otsu) marcaba ~15 % de daño en un tallo sano.
     */
    public function test_el_script_de_python_da_cero_en_un_tallo_sano()
    {
        $this->saltarSinPython();

        $ruta = $this->corteTransparente(conLesion: false);

        try {
            $resultado = (new AnalizadorTallo)->analizar($ruta);
        } finally {
            unlink($ruta);
        }

        $this->assertLessThan(1, $resultado['porcentaje']);
        $this->assertSame(0, $resultado['nivel']);
    }

    public function test_el_script_de_python_rechaza_una_foto_desenfocada()
    {
        $this->saltarSinPython();

        // Como una foto de celular: el corte sobre papel blanco, sin transparencia, y movida
        $ruta = $this->corteTransparente(conLesion: true);
        $corte = imagecreatefrompng($ruta);
        $foto = imagecreatetruecolor(imagesx($corte), imagesy($corte));
        imagefill($foto, 0, 0, imagecolorallocate($foto, 245, 245, 245));
        imagecopy($foto, $corte, 0, 0, 0, 0, imagesx($corte), imagesy($corte));
        for ($i = 0; $i < 40; $i++) {
            imagefilter($foto, IMG_FILTER_GAUSSIAN_BLUR);
        }
        imagepng($foto, $ruta);

        try {
            $this->expectException(FotoNoValida::class);
            $this->expectExceptionMessage('desenfocada');
            (new AnalizadorTallo)->analizar($ruta);
        } finally {
            unlink($ruta);
        }
    }

    private function saltarSinPython(): void
    {
        if (! Process::run([config('escala.python'), '-c', 'import cv2'])->successful()) {
            $this->markTestSkipped('Python con OpenCV no está instalado (ver python/requirements.txt).');
        }
    }

    /**
     * Corte longitudinal de 300x900 px color crema, centrado en un PNG de 500x1100 transparente,
     * con fibras más claras (no son daño) y opcionalmente una lesión café oscura con halo rojizo.
     */
    private function corteTransparente(bool $conLesion): string
    {
        $img = imagecreatetruecolor(500, 1100);
        imagesavealpha($img, true);
        imagealphablending($img, false);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
        imagealphablending($img, true);

        imagefilledrectangle($img, 100, 100, 399, 999, imagecolorallocate($img, 225, 210, 170));
        $fibra = imagecolorallocate($img, 235, 222, 185);
        for ($x = 115; $x < 400; $x += 25) {
            imagefilledrectangle($img, $x, 100, $x + 3, 999, $fibra);
        }

        if ($conLesion) {
            imagefilledellipse($img, 250, 550, 120, 160, imagecolorallocate($img, 190, 90, 60));
            imagefilledellipse($img, 250, 550, 80, 120, imagecolorallocate($img, 90, 40, 30));
        }

        $ruta = tempnam(sys_get_temp_dir(), 'corte').'.png';
        imagepng($img, $ruta);

        return $ruta;
    }
}
