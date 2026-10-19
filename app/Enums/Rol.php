<?php

namespace App\Enums;

/**
 * Roles del sistema. Los valores deben coincidir con el check de usuarios.rol en la BD.
 */
enum Rol: string
{
    case Laboratorista = 'laboratorista';
    case Productor = 'productor';
    case JefeLaboratorio = 'jefe_laboratorio';

    /**
     * Nombre para mostrar en la interfaz.
     */
    public function etiqueta(): string
    {
        return match ($this) {
            self::Laboratorista => 'Laboratorista',
            self::Productor => 'Productor',
            self::JefeLaboratorio => 'Jefe de laboratorio',
        };
    }
}
