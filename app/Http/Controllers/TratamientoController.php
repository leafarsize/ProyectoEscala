<?php

namespace App\Http\Controllers;

use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TratamientoController extends Controller
{
    /**
     * Tratamientos por página en el historial.
     */
    private const POR_PAGINA = 12;

    /**
     * Historial: los tratamientos que el usuario puede ver, el más reciente primero.
     */
    public function index(Request $request): Response
    {
        /** @var User $usuario */
        $usuario = $request->user();

        $tratamientos = Tratamiento::visiblesPara($usuario)
            ->with(['usuario:id,name', 'primerEscaneo', 'ultimoEscaneo.usuario:id,name'])
            ->withCount('escaneos')
            ->latest()
            ->latest('id')
            ->paginate(self::POR_PAGINA)
            ->through(fn (Tratamiento $t) => [
                ...$this->datos($t),
                'escaneos' => $t->escaneos_count,
                'porcentaje_inicial' => $t->primerEscaneo?->porcentaje,
                'ultimo' => $t->ultimoEscaneo?->paraVista(),
            ]);

        return Inertia::render('laboratorio/tratamientos/index', [
            'tratamientos' => $tratamientos,
            'ultimoNivel' => $this->ultimoNivel(),
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
            ],
            'escaneos' => $escaneos,
            'ultimoNivel' => $this->ultimoNivel(),
        ]);
    }

    /**
     * @return array{id: int, nombre: string, variedad: string, lote: string, fecha_inicio: string, estado: string, responsable: string}
     */
    private function datos(Tratamiento $t): array
    {
        return [
            'id' => $t->id,
            'nombre' => $t->nombre,
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
