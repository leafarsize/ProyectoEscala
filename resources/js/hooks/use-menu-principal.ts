import { usePage } from '@inertiajs/react';
import {
    ClipboardList,
    LayoutGrid,
    ScanLine,
    Sprout,
    Users,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { create as escanear } from '@/routes/escaneo';
import { usuarios } from '@/routes/jefe';
import { escaneos } from '@/routes/laboratorio';
import { resultados } from '@/routes/productor';
import type { NavItem, Rol } from '@/types';

type NavItemConRoles = NavItem & {
    /** Roles que ven la opción. Sin `roles`, la ven todos. */
    roles?: Rol[];
};

// Ocultar una opción es solo comodidad: la seguridad real está en el middleware role: de cada ruta
const items: NavItemConRoles[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Escanear tallo', href: escanear(), icon: ScanLine },
    {
        title: 'Escaneos',
        href: escaneos(),
        icon: ClipboardList,
        roles: ['laboratorista', 'jefe_laboratorio'],
    },
    {
        title: 'Mis resultados',
        href: resultados(),
        icon: Sprout,
        roles: ['productor'],
    },
    {
        title: 'Usuarios',
        href: usuarios(),
        icon: Users,
        roles: ['jefe_laboratorio'],
    },
];

/**
 * Opciones del menú principal que corresponden al rol del usuario.
 */
export function useMenuPrincipal(): NavItem[] {
    const rol = usePage().props.auth.user?.rol;

    return items.filter(
        (item) =>
            !item.roles || (rol !== undefined && item.roles.includes(rol)),
    );
}
