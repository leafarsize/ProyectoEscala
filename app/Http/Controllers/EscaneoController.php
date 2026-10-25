<?php

namespace App\Http\Controllers;

use App\Enums\Rol;
use App\Exceptions\FotoNoValida;
use App\Http\Requests\AnalizarTalloRequest;
use App\Models\Escaneo;
use App\Models\Tratamiento;
use App\Models\User;
use App\Services\AnalizadorTallo;
use App\Services\HistorialEscaneos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EscaneoController extends Controller
{
    /**
     * Pantalla para tomar o importar la foto del tallo.
     * Con ?tratamiento={id} se agrega el escaneo a ese tratamiento.
     */
    public function create(Request $request): Response
    {
        /** @var User $usuario */
        $usuario = $request->user();
        $puedeGuardar = $usuario->can('create', Tratamiento::class);

        $tratamientos = $puedeGuardar
            ? Tratamiento::visiblesPara($usuario)
                ->where('estado', Tratamiento::ABIERTO)
                ->withCount('escaneos')
                ->latest()
                ->get()
                ->map(fn (Tratamiento $t) => [
                    'id' => $t->id,
                    'nombre' => $t->nombre,
                    'variedad' => $t->variedad,
                    'lote' => $t->lote,
                    'escaneos' => $t->escaneos_count,
                ])
            : collect();

        $inicial = $request->integer('tratamiento');

        return Inertia::render('escanear', [
            'maxKb' => config('escala.max_kb'),
            'niveles' => config('escala.niveles'),
            'puedeGuardar' => $puedeGuardar,
            'tratamientos' => $tratamientos,
            'tratamientoInicial' => $tratamientos->contains('id', $inicial) ? $inicial : null,
            'productores' => $puedeGuardar
                ? User::where('rol', Rol::Productor)->where('activo', true)->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    /**
     * Analiza la foto y la guarda como escaneo de un tratamiento: el primero de uno nuevo
     * o uno más de un tratamiento abierto. El análisis del productor no se guarda.
     */
    public function analizar(AnalizarTalloRequest $request, AnalizadorTallo $analizador, HistorialEscaneos $historial): JsonResponse
    {
        /** @var User $usuario */
        $usuario = $request->user();
        $foto = $request->file('imagen');
        $tratamiento = null;

        if ($request->guardaEscaneo() && $request->filled('tratamiento_id')) {
            $tratamiento = Tratamiento::findOrFail($request->integer('tratamiento_id'));
            Gate::authorize('view', $tratamiento);

            if (! $tratamiento->estaAbierto()) {
                throw ValidationException::withMessages([
                    'tratamiento_id' => 'El tratamiento está cerrado; ya no admite escaneos.',
                ]);
            }
        }

        try {
            $resultado = $analizador->analizar($foto->getRealPath());
        } catch (FotoNoValida $e) {
            // Sirve para calibrar los umbrales de analizar_tallo.py con fotos reales
            Log::info('Foto rechazada por el análisis', [
                'motivo' => $e->getMessage(),
                'archivo' => $foto->getClientOriginalName(),
                'kb' => round($foto->getSize() / 1024),
            ]);

            throw ValidationException::withMessages(['imagen' => $e->getMessage()]);
        } catch (RuntimeException) {
            abort(503, 'No se pudo analizar la imagen. Intenta de nuevo.');
        }

        if (! $request->guardaEscaneo()) {
            return response()->json([...$resultado, 'tratamiento' => null]);
        }

        // El tratamiento nuevo solo se crea si el análisis salió bien
        [$escaneo, $tratamiento] = DB::transaction(function () use ($request, $usuario, $foto, $resultado, $historial, $tratamiento) {
            $tratamiento ??= Tratamiento::create([
                ...$request->safe()->only(['nombre', 'variedad', 'lote', 'productor_id']),
                'usuario_id' => $usuario->id,
                'fecha_inicio' => today(),
                'estado' => Tratamiento::ABIERTO,
            ]);

            return [$historial->guardar($foto, $resultado, $usuario, $tratamiento), $tratamiento];
        });

        return response()->json([
            ...$resultado,
            'escaneo_id' => $escaneo->id,
            'tratamiento' => [
                'id' => $tratamiento->id,
                'nombre' => $tratamiento->nombre,
                'escaneos' => $tratamiento->escaneos()->count(),
            ],
        ]);
    }

    /**
     * Sirve una imagen del escaneo desde el disco privado.
     */
    public function imagen(Escaneo $escaneo, string $tipo): StreamedResponse
    {
        Gate::authorize('view', $escaneo);

        $ruta = $tipo === 'original' ? $escaneo->imagen_original : $escaneo->imagen_resaltada;
        $disco = Storage::disk(HistorialEscaneos::DISCO);

        abort_unless($disco->exists($ruta), 404);

        return $disco->response($ruta, headers: ['Cache-Control' => 'private, max-age=86400']);
    }
}
