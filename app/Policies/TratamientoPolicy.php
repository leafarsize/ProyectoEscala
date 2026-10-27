<?php

namespace App\Policies;

use App\Enums\Rol;
use App\Models\Tratamiento;
use App\Models\User;

class TratamientoPolicy
{
    /**
     * Jefe de laboratorio: todos. Laboratorista: los suyos y los que tiene con acceso vigente.
     */
    public function view(User $usuario, Tratamiento $tratamiento): bool
    {
        return match ($usuario->rol) {
            Rol::JefeLaboratorio => true,
            Rol::Laboratorista => $tratamiento->usuario_id === $usuario->id
                || $tratamiento->tieneAccesoVigente($usuario),
            Rol::Productor => false,
        };
    }

    /**
     * Iniciar un tratamiento (con su primer escaneo).
     */
    public function create(User $usuario): bool
    {
        return $usuario->tieneRol(Rol::Laboratorista, Rol::JefeLaboratorio);
    }

    /**
     * Agregar un escaneo: quien puede verlo, mientras siga abierto.
     */
    public function agregarEscaneo(User $usuario, Tratamiento $tratamiento): bool
    {
        return $tratamiento->estaAbierto() && $this->view($usuario, $tratamiento);
    }

    /**
     * Eliminar el tratamiento y sus escaneos: el Jefe de laboratorio cualquiera,
     * el laboratorista solo los suyos. Un acceso temporal no basta para borrar.
     */
    public function delete(User $usuario, Tratamiento $tratamiento): bool
    {
        return match ($usuario->rol) {
            Rol::JefeLaboratorio => true,
            Rol::Laboratorista => $tratamiento->usuario_id === $usuario->id,
            Rol::Productor => false,
        };
    }
}
