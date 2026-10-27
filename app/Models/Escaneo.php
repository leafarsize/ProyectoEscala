<?php

namespace App\Models;

use Database\Factories\EscaneoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Análisis de un tallo. Las imágenes se guardan en el disco privado "local".
 *
 * @property int $id
 * @property int $usuario_id
 * @property int|null $tratamiento_id
 * @property string $imagen_original
 * @property string $imagen_resaltada
 * @property float $porcentaje
 * @property int $nivel
 * @property string $etiqueta
 * @property int $area_tallo_px
 * @property int $area_lesion_px
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $usuario
 * @property-read Tratamiento|null $tratamiento
 */
#[Table('escaneos')]
#[Fillable([
    'usuario_id', 'tratamiento_id', 'imagen_original', 'imagen_resaltada',
    'porcentaje', 'nivel', 'etiqueta', 'area_tallo_px', 'area_lesion_px',
])]
class Escaneo extends Model
{
    /** @use HasFactory<EscaneoFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'porcentaje' => 'float',
            'nivel' => 'integer',
            'area_tallo_px' => 'integer',
            'area_lesion_px' => 'integer',
        ];
    }

    /**
     * Quién tomó o importó la foto.
     *
     * @return BelongsTo<User, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Datos para mostrar en la interfaz. Las imágenes se sirven por EscaneoController::imagen().
     *
     * @return array{id: int, porcentaje: float, nivel: int, etiqueta: string, fecha: string|null, usuario: string, imagen_original: string, imagen_resaltada: string}
     */
    public function paraVista(): array
    {
        return [
            'id' => $this->id,
            'porcentaje' => $this->porcentaje,
            'nivel' => $this->nivel,
            'etiqueta' => $this->etiqueta,
            'fecha' => $this->created_at?->toIso8601String(),
            'usuario' => $this->usuario->name,
            'imagen_original' => $this->urlImagen('original'),
            'imagen_resaltada' => $this->urlImagen('resaltada'),
        ];
    }

    /**
     * URL de la imagen. "v" (nombre único del archivo) evita que el navegador muestre
     * una imagen en caché de otro escaneo, ya que la respuesta se guarda un día.
     */
    public function urlImagen(string $tipo): string
    {
        return route('laboratorio.escaneos.imagen', [
            $this, $tipo, 'v' => pathinfo($this->imagen_original, PATHINFO_FILENAME),
        ]);
    }

    /**
     * Tratamiento al que pertenece. Los escaneos anteriores a los tratamientos quedan en NULL.
     *
     * @return BelongsTo<Tratamiento, $this>
     */
    public function tratamiento(): BelongsTo
    {
        return $this->belongsTo(Tratamiento::class);
    }
}
