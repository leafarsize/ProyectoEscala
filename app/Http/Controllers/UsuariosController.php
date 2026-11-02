<?php

namespace App\Http\Controllers;

use App\Enums\Rol;
use App\Http\Requests\ActualizarUsuarioRequest;
use App\Http\Requests\GuardarUsuarioRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use stdClass;

class UsuariosController extends Controller
{
    /**
     * Lista de usuarios del sistema, en orden alfabético.
     */
    public function index(Request $request): Response
    {
        $yo = $request->user()?->id;
        $conHistorial = $this->idsConHistorial();

        $usuarios = DB::table('usuarios')
            ->select('id', 'name', 'email', 'rol', 'activo')
            ->orderBy('name')
            ->get()
            ->map(fn (stdClass $fila): array => [
                'id' => $fila->id,
                'name' => $fila->name,
                'email' => $fila->email,
                'rol' => $fila->rol,
                'rol_etiqueta' => Rol::from($fila->rol)->etiqueta(),
                'activo' => (bool) $fila->activo,
                'es_tu_cuenta' => $fila->id === $yo,
                'puede_eliminar' => $fila->id !== $yo
                    && ! in_array((int) $fila->id, $conHistorial, true),
            ]);

        return Inertia::render('jefe/usuarios/index', [
            'usuarios' => $usuarios,
            'roles' => $this->roles(),
        ]);
    }

    /**
     * Formulario de alta.
     */
    public function create(): Response
    {
        return Inertia::render('jefe/usuarios/crear', [
            'roles' => $this->roles(),
        ]);
    }

    /**
     * Guarda el usuario nuevo con una contraseña temporal.
     */
    public function store(GuardarUsuarioRequest $request): RedirectResponse
    {
        $datos = $request->validated();

        DB::table('usuarios')->insert([
            'name' => $datos['name'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol' => $datos['rol'],
            'activo' => true,
            'debe_cambiar_password' => true,
            'creado_por' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario creado.']);

        return to_route('jefe.usuarios.index');
    }

    /**
     * Actualiza nombre, correo, rol y estado de la cuenta.
     */
    public function update(ActualizarUsuarioRequest $request, int $usuario): RedirectResponse
    {
        abort_unless(DB::table('usuarios')->where('id', $usuario)->exists(), 404);

        $datos = $request->validated();

        $cambios = [
            'name' => $datos['name'],
            'email' => $datos['email'],
            'updated_at' => now(),
        ];

        // Nadie cambia su propio rol ni se desactiva: se quedaría sin poder administrar
        if ($usuario !== $request->user()?->id) {
            $cambios['rol'] = $datos['rol'];
            $cambios['activo'] = $request->boolean('activo');
        }

        DB::table('usuarios')->where('id', $usuario)->update($cambios);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario actualizado.']);

        return to_route('jefe.usuarios.index');
    }

    /**
     * Elimina al usuario, solo si no dejó historial (ver idsConHistorial).
     */
    public function destroy(Request $request, int $usuario): RedirectResponse
    {
        abort_unless(DB::table('usuarios')->where('id', $usuario)->exists(), 404);

        if ($usuario === $request->user()?->id) {
            return $this->error('No puedes eliminar tu propia cuenta.');
        }

        if (in_array($usuario, $this->idsConHistorial(), true)) {
            return $this->error(
                'Ese usuario ya tiene escaneos o tratamientos. Desactiva la cuenta en lugar de eliminarla.'
            );
        }

        DB::table('usuarios')->where('id', $usuario)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Usuario eliminado.']);

        return to_route('jefe.usuarios.index');
    }

    /**
     * Ids de usuarios a los que la base de datos no deja borrar: las claves foráneas de
     * estas tablas son ON DELETE RESTRICT, porque borrarlos perdería el historial.
     *
     * @return list<int>
     */
    private function idsConHistorial(): array
    {
        $ids = [
            ...DB::table('escaneos')->distinct()->pluck('usuario_id')->all(),
            ...DB::table('tratamientos')->distinct()->pluck('usuario_id')->all(),
            ...DB::table('tratamientos')->whereNotNull('productor_id')
                ->distinct()->pluck('productor_id')->all(),
            ...DB::table('avances')->distinct()->pluck('usuario_id')->all(),
            ...DB::table('accesos_tratamiento')->distinct()->pluck('otorgado_por')->all(),
        ];

        return array_values(array_unique(array_map(intval(...), $ids)));
    }

    /**
     * Vuelve a la lista con un toast de error.
     */
    private function error(string $mensaje): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => $mensaje]);

        return to_route('jefe.usuarios.index');
    }

    /**
     * Roles asignables, para el desplegable del formulario.
     *
     * @return list<array{value: string, label: string}>
     */
    private function roles(): array
    {
        return array_map(
            fn (Rol $rol): array => ['value' => $rol->value, 'label' => $rol->etiqueta()],
            Rol::cases(),
        );
    }
}
