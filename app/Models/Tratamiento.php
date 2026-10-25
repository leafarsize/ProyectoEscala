<?php

namespace App\Models;

use App\Enums\Rol;
use Database\Factories\TratamientoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Ensayo sobre un lote de caña. Cada escaneo de tallo pertenece a un tratamiento:
 * el primero lo inicia y los siguientes registran la evolución del daño.
 *
 * @property int $id
 * @property int $usuario_id
 * @property int|null $productor_id
 * @property string $nombre
 * @property string $variedad
 * @property string $lote
 * @property Carbon $fecha_inicio
 * @property string|null $condiciones
 * @property string|null $notas
 * @property string $estado
 * @property Carbon|null $cerrado_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $usuario
 * @property-read User|null $productor
 * @property-read int|null $escaneos_count
 */
#[Table('tratamientos')]
#[Fillable(['usuario_id', 'productor_id', 'nombre', 'variedad', 'lote', 'fecha_inicio', 'condiciones', 'notas', 'estado'])]
class Tratamiento extends Model
{
    /** @use HasFactory<TratamientoFactory> */
    use HasFactory;

    public const ABIERTO = 'abierto';

    public const CERRADO = 'cerrado';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'cerrado_at' => 'datetime',
            'adjuntos' => 'array',
        ];
    }

    public function estaAbierto(): bool
    {
        return $this->estado === self::ABIERTO;
    }

    /**
     * Laboratorista que creó el tratamiento (su dueño).
     *
     * @return BelongsTo<User, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Productor dueño del cultivo.
     *
     * @return BelongsTo<User, $this>
     */
    public function productor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'productor_id');
    }

    /**
     * @return HasMany<Escaneo, $this>
     */
    public function escaneos(): HasMany
    {
        return $this->hasMany(Escaneo::class);
    }

    /**
     * Escaneo con el que inició el tratamiento.
     *
     * @return HasOne<Escaneo, $this>
     */
    public function primerEscaneo(): HasOne
    {
        return $this->hasOne(Escaneo::class)->oldestOfMany();
    }

    /**
     * @return HasOne<Escaneo, $this>
     */
    public function ultimoEscaneo(): HasOne
    {
        return $this->hasOne(Escaneo::class)->latestOfMany();
    }

    /**
     * @return HasMany<AccesoTratamiento, $this>
     */
    public function accesos(): HasMany
    {
        return $this->hasMany(AccesoTratamiento::class);
    }

    /**
     * ¿El usuario tiene un acceso temporal vigente a este tratamiento?
     */
    public function tieneAccesoVigente(User $usuario): bool
    {
        return $this->accesos()->vigentes()->where('usuario_id', $usuario->id)->exists();
    }

    /**
     * Tratamientos que puede ver el usuario: el Jefe de laboratorio todos; el laboratorista
     * los suyos y aquellos a los que tiene acceso vigente. El productor, ninguno aquí.
     *
     * @param  Builder<Tratamiento>  $query
     * @return Builder<Tratamiento>
     */
    public function scopeVisiblesPara(Builder $query, User $usuario): Builder
    {
        return match ($usuario->rol) {
            Rol::JefeLaboratorio => $query,
            Rol::Laboratorista => $query->where(fn (Builder $q) => $q
                ->where('usuario_id', $usuario->id)
                ->orWhereHas('accesos', fn (Builder $a) => $a->vigentes()->where('usuario_id', $usuario->id))),
            Rol::Productor => $query->whereRaw('1 = 0'),
        };
    }
}
