import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

/**
 * Tarjeta del usuario al estilo Nexo: franja azul, iniciales encimadas y nombre en mayúsculas.
 */
export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const getInitials = useInitials();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <div className="h-14 bg-primary" />
            <div className="-mt-9 flex flex-col items-center px-4 pb-3 text-center">
                <span className="flex size-[72px] items-center justify-center rounded-full border-4 border-popover bg-popover text-2xl text-primary">
                    {getInitials(user.name)}
                </span>
                <p className="mt-2 text-sm leading-tight font-bold uppercase">
                    {user.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {user.rol_etiqueta}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                </p>
            </div>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuGroup className="p-1.5">
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Configuración
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    asChild
                    className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950"
                >
                    <Link
                        className="block w-full cursor-pointer"
                        href={logout()}
                        as="button"
                        onClick={handleLogout}
                        data-test="logout-button"
                    >
                        <LogOut className="mr-2 text-current" />
                        Cerrar sesión
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </>
    );
}
