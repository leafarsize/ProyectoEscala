<?php

namespace App\Services;

use App\Exceptions\FotoNoValida;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class AnalizadorHoja
{
    /**
     * Código de salida de analizar_hoja.py cuando la foto no sirve (sin hoja, oscura, etc.).
     */
    private const FOTO_NO_VALIDA = 2;

    /**
     * Analiza la imagen de una hoja de caña con python/analizar_hoja.py.
     *
     * @return array{porcentaje: float, nivel: int, etiqueta: string, area_hoja_px: int, area_lesion_px: int, imagen_resaltada: string}
     *
     * @throws FotoNoValida si el usuario debe tomar la foto de nuevo
     * @throws RuntimeException si el análisis falla por otra razón
     */
    public function analizar(string $rutaImagen): array
    {
        $proceso = Process::timeout(config('escala.timeout'))
            ->run([config('escala.python'), config('escala.script'), $rutaImagen]);

        $salida = json_decode($proceso->output(), true);

        if ($proceso->exitCode() === self::FOTO_NO_VALIDA && isset($salida['error'])) {
            throw new FotoNoValida($salida['error']);
        }

        if (! $proceso->successful() || ! isset($salida['porcentaje'])) {
            Log::error('Falló el análisis de la hoja', [
                'codigo' => $proceso->exitCode(),
                'error' => $proceso->errorOutput(),
            ]);

            throw new RuntimeException('No se pudo analizar la imagen.');
        }

        $porcentaje = (float) $salida['porcentaje'];

        return [
            'porcentaje' => $porcentaje,
            ...$this->clasificar($porcentaje),
            'area_hoja_px' => (int) $salida['area_hoja_px'],
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
}
