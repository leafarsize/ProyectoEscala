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
}
