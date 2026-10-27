<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Acceso temporal de un laboratorista invitado a un tratamiento ajeno.
 *
 * @property int $id
 * @property int $tratamiento_id
 * @property int $usuario_id
 * @property int $otorgado_por
 * @property Carbon $expira_at
 */
#[Table('accesos_tratamiento')]
#[Fillable(['tratamiento_id', 'usuario_id', 'otorgado_por', 'expira_at'])]
class AccesoTratamiento extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expira_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Tratamiento, $this>
     */
    public function tratamiento(): BelongsTo
    {
        return $this->belongsTo(Tratamiento::class);
    }

    /**
     * @param  Builder<AccesoTratamiento>  $query
     * @return Builder<AccesoTratamiento>
     */
    public function scopeVigentes(Builder $query): Builder
    {
        return $query->where('expira_at', '>', now());
    }
}
