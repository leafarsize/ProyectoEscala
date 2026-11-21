<?php

namespace App\Http\Controllers;

use App\Models\Tratamiento;
use App\Models\User;
use App\Services\AnalizadorTallo;
use App\Services\ResumenDano;
use App\Support\RangoFechas;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Comparación del daño promedio entre tratamientos: una barra por tratamiento con
 * su desviación estándar, para ver de un vistazo cuál dejó menos daño.
 *
 * A diferencia del historial, aquí no interesa la evolución dentro de un
 * tratamiento, sino el resumen de cada uno frente a los demás.
 */
class ComparacionController extends Controller
{
    /**
     * Barras que caben legibles en una gráfica. Es el tope de lo que se puede
     * seleccionar a la vez: con más, los nombres del eje X dejan de leerse.
     */
    private const MAXIMO_SELECCION = 12;

    /**
     * Pantalla de comparación.
     */
    public function index(Request $request, AnalizadorTallo $analizador): Response
    {
        /** @var User $usuario */
        $usuario = $request->user();

        $filtros = $this->filtros($request);
        $todos = $this->resumir($usuario, $filtros, $analizador);

        // Un tratamiento sin tallos no se grafica: una barra de altura 0 se leería
        // como "daño 0", que es lo contrario de "todavía no se ha medido".
        $comparables = $this->ordenar(
            $todos->filter(fn (array $fila): bool => $fila['tallos'] > 0)->values(),
            $filtros['orden'],
        );

        return Inertia::render('laboratorio/comparar', [
            // Candidatos: la persona elige cuáles de estos entran a la gráfica
            'tratamientos' => $comparables,
            'sinTallos' => $todos->count() - $comparables->count(),
            'filtros' => $filtros,
            'ultimoNivel' => $analizador->ultimoNivel(),
            'maximoSeleccion' => self::MAXIMO_SELECCION,
        ]);
    }

    /**
     * Exporta la comparación a Excel (CSV con BOM UTF-8), con los mismos filtros
     * pero sin el tope de barras: en una hoja de cálculo caben todos.
     */
    public function exportar(Request $request, AnalizadorTallo $analizador): StreamedResponse
    {
        /** @var User $usuario */
        $usuario = $request->user();

        $filtros = $this->filtros($request);
        $elegidos = $this->idsElegidos($request);

        $tratamientos = $this->ordenar(
            $this->resumir($usuario, $filtros, $analizador)
                ->filter(fn (array $fila): bool => $fila['tallos'] > 0
                    // Sin selección se exporta todo lo que el filtro deja ver
                    && ($elegidos === [] || in_array($fila['id'], $elegidos, true)))
                ->values(),
            $filtros['orden'],
        );

        $nombreArchivo = 'comparacion_tratamientos_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($tratamientos) {
            $salida = fopen('php://output', 'w');

            if ($salida === false) {
                throw new RuntimeException('No se pudo abrir la salida para escribir el CSV.');
            }

            // BOM UTF-8 para que Microsoft Excel abra los acentos automáticamente
            fprintf($salida, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($salida, [
                'ID',
                'Tratamiento',
                'Temperatura',
                'Estado',
                'Responsable (Laboratorista)',
                'Fecha Inicio',
                'Tallos Analizados',
                'Daño Promedio (%)',
                'Desviación Estándar',
                'Nivel Severidad',
            ], escape: '\\');

            foreach ($tratamientos as $fila) {
                fputcsv($salida, [
                    $fila['id'],
                    $fila['nombre'],
                    $fila['temperatura'] ?? 'N/A',
                    ucfirst($fila['estado']),
                    $fila['responsable'],
                    $fila['fecha_inicio'],
                    $fila['tallos'],
                    number_format((float) $fila['promedio'], 2, '.', ''),
                    // Con un solo tallo no hay desviación que reportar
                    $fila['desviacion'] !== null
                        ? number_format($fila['desviacion'], 2, '.', '')
                        : 'N/A',
                    "Nivel {$fila['nivel']} ({$fila['etiqueta']})",
                ], escape: '\\');
            }

            fclose($salida);
        }, $nombreArchivo, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Filtros de la pantalla, saneados.
     *
     * @return array{buscar: string, desde: string, hasta: string, estado: string, orden: string}
     */
    private function filtros(Request $request): array
    {
        $estado = $request->string('estado')->value();
        $orden = $request->string('orden')->value();

        return [
            'buscar' => $request->string('buscar')->trim()->value(),
            // Rango de fechas de inicio del tratamiento (AAAA-MM-DD)
            ...RangoFechas::deRequest($request),
            'estado' => in_array($estado, [Tratamiento::ABIERTO, Tratamiento::CERRADO], true)
                ? $estado
                : 'todos',
            // Por promedio se ve primero el tratamiento que dejó menos daño
            'orden' => $orden === 'fecha' ? 'fecha' : 'promedio',
        ];
    }

    /**
     * Ids que la persona marcó en la pantalla, para exportar justo lo que ve.
     * La visibilidad no depende de esta lista: resumir() ya filtró por permisos.
     *
     * @return list<int>
     */
    private function idsElegidos(Request $request): array
    {
        $ids = array_filter(
            array_map(intval(...), explode(',', $request->string('ids')->value())),
            fn (int $id): bool => $id > 0,
        );

        return array_values(array_unique($ids));
    }

    /**
     * Resume cada tratamiento visible: promedio de daño, desviación y número de tallos.
     *
     * @param  array{buscar: string, desde: string, hasta: string, estado: string, orden: string}  $filtros
     * @return Collection<int, array{id: int, nombre: string, temperatura: string|null, estado: string, responsable: string, fecha_inicio: string, tallos: int, promedio: float|null, desviacion: float|null, nivel: int, etiqueta: string}>
     */
    private function resumir(User $usuario, array $filtros, AnalizadorTallo $analizador): Collection
    {
        $query = Tratamiento::visiblesPara($usuario)->with('usuario:id,name');

        if ($filtros['buscar'] !== '') {
            $query->where('nombre', 'like', "%{$filtros['buscar']}%");
        }

        if ($filtros['estado'] !== 'todos') {
            $query->where('estado', $filtros['estado']);
        }

        // El rango se mide por la fecha de inicio: es la que identifica al ensayo
        RangoFechas::aplicar($query, $filtros);

        $tratamientos = $query->latest()->latest('id')->get();

        // Un solo viaje a la base por todos los porcentajes, en vez de uno por tratamiento
        $resumenes = ResumenDano::porTratamiento($tratamientos->modelKeys());

        return $tratamientos->map(function (Tratamiento $t) use ($resumenes, $analizador): array {
            $resumen = $resumenes[$t->id] ?? ResumenDano::vacio();

            // El promedio se clasifica con la misma escala que un tallo suelto
            $escala = $resumen->promedio === null
                ? ['nivel' => 0, 'etiqueta' => '']
                : $analizador->clasificar($resumen->promedio);

            return [
                'id' => $t->id,
                'nombre' => $t->nombre,
                'temperatura' => $t->temperatura,
                'estado' => $t->estado,
                'responsable' => $t->usuario->name,
                'fecha_inicio' => $t->fecha_inicio->toDateString(),
                'tallos' => $resumen->tallos,
                'promedio' => $resumen->promedio,
                'desviacion' => $resumen->desviacion,
                'nivel' => $escala['nivel'],
                'etiqueta' => $escala['etiqueta'],
            ];
        });
    }

    /**
     * @template TFila of array{promedio: float|null, fecha_inicio: string}
     *
     * @param  Collection<int, TFila>  $tratamientos
     * @return Collection<int, TFila>
     */
    private function ordenar(Collection $tratamientos, string $orden): Collection
    {
        if ($orden === 'fecha') {
            return $tratamientos->sortByDesc('fecha_inicio')->values();
        }

        // Menos daño primero: es la respuesta a "¿cuál tratamiento funcionó mejor?"
        return $tratamientos->sortBy('promedio')->values();
    }
}
