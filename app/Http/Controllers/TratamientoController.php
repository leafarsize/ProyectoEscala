<?php

namespace App\Http\Controllers;

use App\Enums\Rol;
use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use App\Services\HistorialEscaneos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TratamientoController extends Controller
{
    /**
     * Tratamientos por página en el historial.
     */
    private const POR_PAGINA = 12;

    /**
     * Historial: los tratamientos que el usuario puede ver, el más reciente primero.
     * Permite filtrar por nombre de tratamiento y nombre de laboratorista.
     */
    public function index(Request $request): Response
    {
        /** @var User $usuario */
        $usuario = $request->user();

        $buscar = $request->string('buscar')->trim()->value();
        $laboratorista = $request->string('laboratorista')->trim()->value();

        $query = Tratamiento::visiblesPara($usuario)
            ->with(['usuario:id,name', 'primerEscaneo', 'ultimoEscaneo.usuario:id,name'])
            ->withCount('escaneos');

        if ($buscar !== '') {
            $query->where('nombre', 'like', "%{$buscar}%");
        }

        if ($laboratorista !== '') {
            $query->whereHas('usuario', fn ($q) => $q->where('name', 'like', "%{$laboratorista}%"));
        }

        $tratamientos = $query
            ->latest()
            ->latest('id')
            ->paginate(self::POR_PAGINA)
            ->withQueryString()
            ->through(fn (Tratamiento $t) => [
                ...$this->datos($t),
                'escaneos' => $t->escaneos_count,
                'porcentaje_inicial' => $t->primerEscaneo?->porcentaje,
                'ultimo' => $t->ultimoEscaneo?->paraVista(),
            ]);

        // Lista de laboratoristas disponibles para sugerir en el filtro
        $laboratoristas = User::whereIn('rol', [Rol::Laboratorista, Rol::JefeLaboratorio])
            ->where('activo', true)
            ->orderBy('name')
            ->pluck('name');

        return Inertia::render('laboratorio/tratamientos/index', [
            'tratamientos' => $tratamientos,
            'ultimoNivel' => $this->ultimoNivel(),
            'filtros' => [
                'buscar' => $buscar,
                'laboratorista' => $laboratorista,
            ],
            'laboratoristas' => $laboratoristas,
        ]);
    }

    /**
     * Exporta los reportes de tratamientos a Excel (formato CSV con UTF-8 BOM compatible con MS Excel).
     */
    public function exportar(Request $request): StreamedResponse
    {
        /** @var User $usuario */
        $usuario = $request->user();

        $buscar = $request->string('buscar')->trim()->value();
        $laboratorista = $request->string('laboratorista')->trim()->value();

        $query = Tratamiento::visiblesPara($usuario)
            ->with(['usuario:id,name', 'productor:id,name', 'primerEscaneo', 'ultimoEscaneo'])
            ->withCount('escaneos');

        if ($buscar !== '') {
            $query->where('nombre', 'like', "%{$buscar}%");
        }

        if ($laboratorista !== '') {
            $query->whereHas('usuario', fn ($q) => $q->where('name', 'like', "%{$laboratorista}%"));
        }

        $tratamientos = $query->latest()->get();

        $nombreArchivo = 'reporte_tratamientos_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($tratamientos) {
            $salida = fopen('php://output', 'w');

            // BOM UTF-8 para que Microsoft Excel abra acentos y caracteres especiales automáticamente
            fprintf($salida, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($salida, [
                'ID',
                'Tratamiento',
                'Medicamento / Producto',
                'Duración',
                'Temperatura',
                'Variedad',
                'Lote',
                'Fecha Inicio',
                'Estado',
                'Responsable (Laboratorista)',
                'Productor',
                'Total Tallos',
                'Daño Inicial (%)',
                'Daño Actual (%)',
                'Variación Daño (pts)',
                'Nivel Severidad',
                'Diagnóstico de Efectividad',
            ], escape: '\\');

            foreach ($tratamientos as $t) {
                $inicial = $t->primerEscaneo?->porcentaje;
                $ultimo = $t->ultimoEscaneo?->porcentaje;
                $cambio = ($inicial !== null && $ultimo !== null && $t->escaneos_count > 1)
                    ? round($ultimo - $inicial, 2)
                    : null;

                $diagnostico = 'Sin escaneos';
                if ($t->escaneos_count === 1) {
                    $diagnostico = 'Escaneo inicial';
                } elseif ($t->escaneos_count > 1 && $cambio !== null) {
                    if ($cambio <= 0) {
                        $diagnostico = 'Funcionando (Daño contenido)';
                    } elseif ($cambio <= 2.5) {
                        $diagnostico = 'Efectividad moderada';
                    } else {
                        $diagnostico = 'No funcionando (Daño avanzando)';
                    }
                }

                fputcsv($salida, [
                    $t->id,
                    $t->nombre,
                    $t->medicamento ?? 'N/A',
                    $t->duracion ?? 'N/A',
                    $t->temperatura ?? 'N/A',
                    $t->variedad ?? 'N/A',
                    $t->lote ?? 'N/A',
                    $t->fecha_inicio->format('d/m/Y'),
                    ucfirst($t->estado),
                    $t->usuario->name,
                    $t->productor?->name ?? 'N/A',
                    $t->escaneos_count,
                    $inicial !== null ? number_format($inicial, 2, '.', '').'%' : 'N/A',
                    $ultimo !== null ? number_format($ultimo, 2, '.', '').'%' : 'N/A',
                    $cambio !== null ? ($cambio > 0 ? "+{$cambio}" : "{$cambio}") : 'N/A',
                    $t->ultimoEscaneo ? "Nivel {$t->ultimoEscaneo->nivel} ({$t->ultimoEscaneo->etiqueta})" : 'N/A',
                    $diagnostico,
                ], escape: '\\');
            }

            fclose($salida);
        }, $nombreArchivo, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Exporta el desglose detallado de todos los tallos de un tratamiento específico a Excel (CSV).
     */
    public function exportarDetalle(Tratamiento $tratamiento): StreamedResponse
    {
        Gate::authorize('view', $tratamiento);

        $tratamiento->load(['usuario:id,name', 'productor:id,name', 'escaneos.usuario:id,name']);
        $escaneos = $tratamiento->escaneos()->oldest()->get();

        $nombreArchivo = 'reporte_'.Str::slug($tratamiento->nombre).'_'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($tratamiento, $escaneos) {
            $salida = fopen('php://output', 'w');

            // BOM UTF-8
            fprintf($salida, chr(0xEF).chr(0xBB).chr(0xBF));

            // Ficha del tratamiento
            fputcsv($salida, ['REPORTE DE TRATAMIENTO - PROYECTO ESCALA'], escape: '\\');
            fputcsv($salida, ['Tratamiento', $tratamiento->nombre], escape: '\\');
            fputcsv($salida, ['Medicamento', $tratamiento->medicamento ?? 'N/A'], escape: '\\');
            fputcsv($salida, ['Duración', $tratamiento->duracion ?? 'N/A'], escape: '\\');
            fputcsv($salida, ['Temperatura', $tratamiento->temperatura ?? 'N/A'], escape: '\\');
            fputcsv($salida, ['Responsable', $tratamiento->usuario->name], escape: '\\');
            fputcsv($salida, ['Productor', $tratamiento->productor?->name ?? 'N/A'], escape: '\\');
            fputcsv($salida, ['Fecha Inicio', $tratamiento->fecha_inicio->format('d/m/Y')], escape: '\\');
            fputcsv($salida, ['Estado', ucfirst($tratamiento->estado)], escape: '\\');
            fputcsv($salida, [], escape: '\\');

            // Tabla de escaneos/tallos
            fputcsv($salida, [
                'No.',
                'Tallo / No. Caña',
                'Fecha',
                'Hora',
                'Porcentaje de Daño (%)',
                'Nivel de Severidad',
                'Etiqueta de Escala',
                'Área Tallo (px)',
                'Área Lesión (px)',
                'Laboratorista',
            ], escape: '\\');

            foreach ($escaneos as $idx => $e) {
                fputcsv($salida, [
                    $idx + 1,
                    $e->numero_cana ?? 'Tallo #'.($idx + 1),
                    $e->created_at?->format('d/m/Y') ?? 'N/A',
                    $e->created_at?->format('H:i') ?? 'N/A',
                    number_format($e->porcentaje, 2, '.', '').'%',
                    $e->nivel,
                    $e->etiqueta,
                    $e->area_tallo_px,
                    $e->area_lesion_px,
                    $e->usuario->name,
                ], escape: '\\');
            }

            fclose($salida);
        }, $nombreArchivo, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Detalle: todos los escaneos del tratamiento en orden (el primero es el inicio).
     */
    public function show(Request $request, Tratamiento $tratamiento): Response
    {
        Gate::authorize('view', $tratamiento);

        $tratamiento->load(['usuario:id,name', 'productor:id,name']);
        $escaneos = $tratamiento->escaneos()
            ->with('usuario:id,name')
            ->oldest()
            ->oldest('id')
            ->get()
            ->map(fn (Escaneo $e) => $e->paraVista());

        return Inertia::render('laboratorio/tratamientos/show', [
            'tratamiento' => [
                ...$this->datos($tratamiento),
                'productor' => $tratamiento->productor?->name,
                'notas' => $tratamiento->notas,
                'puede_agregar' => $request->user()?->can('agregarEscaneo', $tratamiento) ?? false,
                'puede_eliminar' => $request->user()?->can('delete', $tratamiento) ?? false,
            ],
            'escaneos' => $escaneos,
            'ultimoNivel' => $this->ultimoNivel(),
            'niveles' => Config::array('escala.niveles'),
        ]);
    }

    /**
     * Elimina el tratamiento con todos sus escaneos e imágenes. No se puede deshacer.
     */
    public function destroy(Tratamiento $tratamiento, HistorialEscaneos $historial): RedirectResponse
    {
        Gate::authorize('delete', $tratamiento);

        $historial->eliminarTratamiento($tratamiento);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tratamiento eliminado.']);

        return to_route('laboratorio.tratamientos.index');
    }

    /**
     * @return array{id: int, nombre: string, medicamento: string|null, duracion: string|null, temperatura: string|null, variedad: string|null, lote: string|null, fecha_inicio: string, estado: string, responsable: string}
     */
    private function datos(Tratamiento $t): array
    {
        return [
            'id' => $t->id,
            'nombre' => $t->nombre,
            'medicamento' => $t->medicamento,
            'duracion' => $t->duracion,
            'temperatura' => $t->temperatura,
            'variedad' => $t->variedad,
            'lote' => $t->lote,
            'fecha_inicio' => $t->fecha_inicio->toDateString(),
            'estado' => $t->estado,
            'responsable' => $t->usuario->name,
        ];
    }

    /**
     * Nivel más alto de la escala (config/escala.php), para mostrar "Nivel N de 5".
     */
    private function ultimoNivel(): int
    {
        $niveles = array_map(intval(...), array_column(Config::array('escala.niveles'), 'nivel'));

        return $niveles === [] ? 0 : max($niveles);
    }
}
