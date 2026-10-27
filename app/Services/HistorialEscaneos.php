<?php

namespace App\Services;

use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class HistorialEscaneos
{
    /**
     * Disco privado: las fotos solo se sirven a través de EscaneoController::imagen().
     */
    public const DISCO = 'local';

    /**
     * Guarda la foto original, la imagen resaltada y el resultado del análisis en el tratamiento.
     *
     * @param  array{porcentaje: float, nivel: int, etiqueta: string, area_tallo_px: int, area_lesion_px: int, imagen_resaltada: string}  $resultado
     */
    public function guardar(UploadedFile $foto, array $resultado, User $usuario, Tratamiento $tratamiento): Escaneo
    {
        $resaltada = base64_decode(Str::after($resultado['imagen_resaltada'], ','), true);
        if ($resaltada === false) {
            throw new RuntimeException('La imagen resaltada del análisis no es base64 válido.');
        }

        $carpeta = 'escaneos/'.now()->format('Y/m');
        $nombre = (string) Str::uuid();
        $disco = Storage::disk(self::DISCO);

        $rutaOriginal = $foto->storeAs($carpeta, "{$nombre}.{$foto->extension()}", self::DISCO);
        $rutaResaltada = "{$carpeta}/{$nombre}-resaltada.jpg";

        if ($rutaOriginal === false || ! $disco->put($rutaResaltada, $resaltada)) {
            $disco->delete(array_filter([$rutaOriginal, $rutaResaltada]));

            throw new RuntimeException('No se pudieron guardar las imágenes del escaneo.');
        }

        try {
            return Escaneo::create([
                'usuario_id' => $usuario->id,
                'tratamiento_id' => $tratamiento->id,
                'imagen_original' => $rutaOriginal,
                'imagen_resaltada' => $rutaResaltada,
                'porcentaje' => $resultado['porcentaje'],
                'nivel' => $resultado['nivel'],
                'etiqueta' => $resultado['etiqueta'],
                'area_tallo_px' => $resultado['area_tallo_px'],
                'area_lesion_px' => $resultado['area_lesion_px'],
            ]);
        } catch (Throwable $e) {
            // Sin registro en la BD, las imágenes quedarían huérfanas
            $disco->delete([$rutaOriginal, $rutaResaltada]);

            throw $e;
        }
    }

    /**
     * Borra el tratamiento con todos sus escaneos y las imágenes de cada uno.
     *
     * Los escaneos no caen en cascada (tratamiento_id es nullOnDelete), así que se
     * eliminan a mano; si no, quedarían escaneos huérfanos y fotos en disco.
     */
    public function eliminarTratamiento(Tratamiento $tratamiento): void
    {
        $rutas = $tratamiento->escaneos()
            ->get(['imagen_original', 'imagen_resaltada'])
            ->flatMap(fn (Escaneo $e) => [$e->imagen_original, $e->imagen_resaltada])
            ->all();

        DB::transaction(function () use ($tratamiento) {
            $tratamiento->escaneos()->delete();
            $tratamiento->delete();
        });

        // Las fotos se borran tras confirmar la BD, para no perderlas si la transacción falla
        Storage::disk(self::DISCO)->delete($rutas);
    }
}
