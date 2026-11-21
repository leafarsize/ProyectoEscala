<?php

namespace App\Policies;

use App\Enums\Rol;
use App\Models\Escaneo;
use App\Models\User;

class EscaneoPolicy
{
    /**
     * Un escaneo (y sus fotos) lo ve quien puede ver su tratamiento.
     */
    public function view(User $usuario, Escaneo $escaneo): bool
    {
        if ($escaneo->tratamiento !== null) {
            return $usuario->can('view', $escaneo->tratamiento);
        }

        // Escaneos sin tratamiento (anteriores a esta función): su autor o el Jefe de laboratorio
        return $usuario->rol === Rol::JefeLaboratorio
            || ($usuario->rol === Rol::Laboratorista && $escaneo->usuario_id === $usuario->id);
    }

    /**
     * Borrar un escaneo que no sirve (foto mal tomada, tallo repetido). Lo hacen
     * quienes pueden eliminar el tratamiento completo (su dueño y el Jefe) y, además,
     * quien subió ese escaneo, para que pueda deshacer su propio error.
     */
    public function delete(User $usuario, Escaneo $escaneo): bool
    {
        if (! $this->view($usuario, $escaneo)) {
            return false;
        }

        if ($escaneo->tratamiento === null) {
            // Ya pasó por view(): es su autor o el Jefe de laboratorio
            return true;
        }

        return $usuario->can('delete', $escaneo->tratamiento)
            || $escaneo->usuario_id === $usuario->id;
    }
}
