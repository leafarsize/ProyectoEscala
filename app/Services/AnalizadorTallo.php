<?php

namespace App\Services;

use App\Exceptions\FotoNoValida;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class AnalizadorTallo
{
    /**
     * Código de salida de analizar_tallo.py cuando la foto no sirve (sin tallo, oscura, etc.).
     */
    private const FOTO_NO_VALIDA = 2;

    /**
     * Analiza la imagen de un tallo de caña con python/analizar_tallo.py.
     *
     * @return array<string, mixed> Medición final o imágenes para revisar la máscara.
     *
     * @throws FotoNoValida si el usuario debe tomar la foto de nuevo
     * @throws RuntimeException si el análisis falla por otra razón
     */
    public function analizar(string $rutaImagen, bool $revisar = false, ?string $rutaMascara = null): array
    {
        $comando = [config('escala.python'), config('escala.script'), $rutaImagen];
        if ($revisar) {
            $comando[] = '--revisar';
        } elseif ($rutaMascara !== null) {
            array_push($comando, '--mascara', $rutaMascara);
        }

        $proceso = Process::timeout(config('escala.timeout'))
            ->run($comando);

        $salida = json_decode($proceso->output(), true);

        if ($proceso->exitCode() === self::FOTO_NO_VALIDA && isset($salida['error'])) {
            throw new FotoNoValida($salida['error']);
        }

        if (! $proceso->successful() || ! isset($salida[$revisar ? 'mapa_revision' : 'porcentaje'])) {
            Log::error('Falló el análisis del tallo', [
                'codigo' => $proceso->exitCode(),
                'error' => $proceso->errorOutput(),
            ]);

            throw new RuntimeException('No se pudo analizar la imagen.');
        }

        if ($revisar) {
            return $salida;
        }

        $porcentaje = (float) $salida['porcentaje'];

        return [
            'porcentaje' => $porcentaje,
            ...$this->clasificar($porcentaje),
            'area_tallo_px' => (int) $salida['area_tallo_px'],
            'area_lesion_px' => (int) $salida['area_lesion_px'],
            'imagen_resaltada' => $salida['imagen_resaltada'],
        ];
    }

    /**
     * Nivel de severidad (0 a 5) según los rangos de config/escala.php.
     *
     * @return array{nivel: int, etiqueta: string}
     */
    public function clasificar(float $porcentaje): array
    {
        foreach (config('escala.niveles') as $nivel) {
            if ($nivel['hasta'] === null || $porcentaje < $nivel['hasta']) {
                return ['nivel' => $nivel['nivel'], 'etiqueta' => $nivel['etiqueta']];
            }
        }

        throw new RuntimeException('config/escala.php: el último nivel debe tener "hasta" => null.');
    }

    /**
     * Nivel más alto de la escala (config/escala.php), para mostrar "Nivel N de 5".
     */
    public function ultimoNivel(): int
    {
        $niveles = array_map(intval(...), array_column(Config::array('escala.niveles'), 'nivel'));

        return $niveles === [] ? 0 : max($niveles);
    }
}
