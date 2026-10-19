<?php

namespace App\Http\Middleware;

use App\Enums\Rol;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deja pasar solo a los usuarios que tienen alguno de los roles indicados.
 *
 * Uso en rutas: ->middleware('rol:jefe_laboratorio,laboratorista')
 */
class VerificarRol
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Rol::from() truena si la ruta tiene un rol mal escrito: es un error de programación, no un 403
        $permitidos = array_map(fn (string $rol) => Rol::from($rol), $roles);

        $usuario = $request->user();

        if (! $usuario instanceof User || ! $usuario->tieneRol(...$permitidos)) {
            abort(403, 'No tienes permiso para acceder a esta sección.');
        }

        return $next($request);
    }
}
