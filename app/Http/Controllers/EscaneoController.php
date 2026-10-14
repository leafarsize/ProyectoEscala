<?php

namespace App\Http\Controllers;

use App\Exceptions\FotoNoValida;
use App\Http\Requests\AnalizarHojaRequest;
use App\Services\AnalizadorHoja;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class EscaneoController extends Controller
{
    /**
     * Pantalla para tomar o importar la foto de la hoja.
     */
    public function create(): Response
    {
        return Inertia::render('escanear', [
            'maxKb' => config('escala.max_kb'),
            'niveles' => config('escala.niveles'),
        ]);
    }

    /**
     * Analiza la foto y devuelve el resultado. No se guarda nada (demo).
     */
    public function analizar(AnalizarHojaRequest $request, AnalizadorHoja $analizador): JsonResponse
    {
        try {
            $resultado = $analizador->analizar($request->file('imagen')->getRealPath());
        } catch (FotoNoValida $e) {
            // Sirve para calibrar los umbrales de analizar_hoja.py con fotos reales
            Log::info('Foto rechazada por el análisis', [
                'motivo' => $e->getMessage(),
                'archivo' => $request->file('imagen')->getClientOriginalName(),
                'kb' => round($request->file('imagen')->getSize() / 1024),
            ]);

            throw ValidationException::withMessages(['imagen' => $e->getMessage()]);
        } catch (RuntimeException) {
            abort(503, 'No se pudo analizar la imagen. Intenta de nuevo.');
        }

        return response()->json($resultado);
    }
}
