<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cierra la sesión de un usuario que fue desactivado mientras la tenía abierta.
 * También cubre los inicios de sesión que no pasan por la contraseña (passkeys).
 */
class VerificarCuentaActiva
{
    public const MENSAJE = 'Tu cuenta está desactivada. Contacta al Jefe de laboratorio.';

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if (! $usuario instanceof User || $usuario->activo) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Peticiones fetch (p. ej. el análisis del escaneo) esperan JSON, no una redirección
        if ($request->expectsJson()) {
            return response()->json(['message' => self::MENSAJE], 401);
        }

        return redirect()->route('login')->withErrors(['email' => self::MENSAJE]);
    }
}
