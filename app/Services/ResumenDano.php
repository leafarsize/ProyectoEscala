<?php

namespace App\Services;

use App\Models\Escaneo;
use Illuminate\Support\Collection;

/**
 * Resumen del daño de un conjunto de tallos: cuántos son, cuánto daño tuvieron en
 * promedio y qué tan parejos fueron entre sí.
 *
 * El cálculo se hace aquí, en PHP, y no con AVG()/STDDEV() de SQL: las pruebas
 * corren en SQLite (que no tiene stddev) y producción en Postgres, así que un solo
 * camino evita que el número dependa de la base de datos. Con decenas de escaneos
 * por tratamiento el costo es irrelevante.
 */
final class ResumenDano
{
    private function __construct(
        /** Número de tallos escaneados. */
        public readonly int $tallos,
        /** Daño promedio en porcentaje; null si no hay ningún tallo. */
        public readonly ?float $promedio,
        /** Desviación estándar muestral; null con menos de dos tallos. */
        public readonly ?float $desviacion,
    ) {}

    /**
     * @param  array<array-key, float|int|string>  $porcentajes  Un valor por tallo analizado
     */
    public static function de(array $porcentajes): self
    {
        $valores = array_values(array_map(floatval(...), $porcentajes));
        $tallos = count($valores);

        if ($tallos === 0) {
            return new self(0, null, null);
        }

        $promedio = array_sum($valores) / $tallos;

        return new self($tallos, round($promedio, 2), self::desviacion($valores, $promedio));
    }

    /**
     * Resumen de varios tratamientos en una sola consulta, para no preguntar los
     * porcentajes una vez por tratamiento.
     *
     * Los tratamientos sin escaneos no aparecen en el resultado: quien los consulte
     * recibe un resumen vacío con el operador ?? de abajo.
     *
     * @param  array<array-key, int>  $tratamientoIds
     * @return array<int, self>
     */
    public static function porTratamiento(array $tratamientoIds): array
    {
        if ($tratamientoIds === []) {
            return [];
        }

        return Escaneo::whereIn('tratamiento_id', $tratamientoIds)
            ->get(['tratamiento_id', 'porcentaje'])
            ->groupBy('tratamiento_id')
            ->map(fn (Collection $escaneos): self => self::de(
                $escaneos->map(fn (Escaneo $e): float => (float) $e->porcentaje)->all()
            ))
            ->all();
    }

    /**
     * Resumen vacío, para un tratamiento al que todavía no se le escanea ningún tallo.
     */
    public static function vacio(): self
    {
        return new self(0, null, null);
    }

    /**
     * Desviación estándar muestral (divide entre n − 1): los tallos escaneados son
     * una muestra del lote, no el lote completo.
     *
     * Con un solo tallo no está definida y se devuelve null en vez de 0, porque un
     * 0 afirmaría que no hubo variación entre tallos cuando en realidad no se sabe.
     *
     * @param  list<float>  $valores
     */
    private static function desviacion(array $valores, float $promedio): ?float
    {
        $tallos = count($valores);

        if ($tallos < 2) {
            return null;
        }

        $cuadrados = array_sum(array_map(
            fn (float $valor): float => ($valor - $promedio) ** 2,
            $valores,
        ));

        return round(sqrt($cuadrados / ($tallos - 1)), 2);
    }
}
