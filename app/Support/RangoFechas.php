<?php

namespace App\Support;

use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Http\Request;

/**
 * Rango «desde / hasta» de los filtros de pantalla, saneado antes de llegar a la
 * consulta: los valores vienen de la URL y van directo a un where sobre una
 * columna de tipo date.
 *
 * Lo usan el historial de tratamientos y la comparación, para que el filtro por
 * fecha se comporte igual en las dos pantallas.
 */
final class RangoFechas
{
    /**
     * Toma «desde» y «hasta» de la petición. Cada uno es una fecha AAAA-MM-DD o
     * cadena vacía si no vino o no es una fecha válida.
     *
     * @return array{desde: string, hasta: string}
     */
    public static function deRequest(Request $request): array
    {
        return [
            'desde' => self::fecha($request, 'desde'),
            'hasta' => self::fecha($request, 'hasta'),
        ];
    }

    /**
     * Acota la consulta al rango. Un extremo vacío no acota ese lado, así que
     * «solo desde» y «solo hasta» funcionan sin casos especiales.
     *
     * Los dos extremos son inclusivos: pedir del 15 al 15 trae lo de ese día.
     *
     * @param  array{desde: string, hasta: string}  $rango
     */
    public static function aplicar(Builder $query, array $rango, string $columna = 'fecha_inicio'): void
    {
        if ($rango['desde'] !== '') {
            $query->whereDate($columna, '>=', $rango['desde']);
        }

        if ($rango['hasta'] !== '') {
            $query->whereDate($columna, '<=', $rango['hasta']);
        }
    }

    /**
     * Una fecha del filtro, o cadena vacía si no vino o no es una fecha válida.
     */
    private static function fecha(Request $request, string $campo): string
    {
        $valor = $request->string($campo)->trim()->value();

        if ($valor === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
            return '';
        }

        return strtotime($valor) === false ? '' : $valor;
    }
}
