import { Link, usePage } from '@inertiajs/react';
import { Menu, UserRound } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMenuPrincipal } from '@/hooks/use-menu-principal';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

/**
 * Barra superior al estilo Nexo: logos institucionales a la izquierda,
 * menú del rol y avatar a la derecha.
 */
export function AppHeader({ breadcrumbs = [] }: Props) {
    const { auth, name } = usePage().props;
    const menuPrincipal = useMenuPrincipal();
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            <header className="sticky top-0 z-40 border-t-2 border-b border-t-tec-verde bg-card shadow-xs">
                <div className="mx-auto flex h-16 items-center gap-2 px-4 md:max-w-7xl">
                    {/* Menú en celular */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Abrir menú"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 bg-card">
                                <SheetHeader>
                                    <SheetTitle className="text-left font-bold text-tec-marino dark:text-foreground">
                                        {name}
                                    </SheetTitle>
                                </SheetHeader>
                                <nav className="flex flex-col gap-1 px-2">
                                    {menuPrincipal.map((item) => (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent',
                                                isCurrentUrl(item.href) &&
                                                    'bg-primary text-primary-foreground hover:bg-primary',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="size-5" />
                                            )}
                                            {item.title}
                                        </Link>
                                    ))}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex items-center gap-3"
                    >
                        <img
                            src="/images/cana-escala.png"
                            alt=""
                            className="h-9 w-auto"
                        />
                        <span className="text-lg font-bold text-tec-marino dark:text-foreground">
                            {name}
                        </span>
                    </Link>

                    {/* Menú en escritorio */}
                    <nav className="ml-auto hidden h-full items-stretch gap-1 lg:flex">
                        {menuPrincipal.map((item) => (
                            <Link
                                key={item.title}
                                href={item.href}
                                className={cn(
                                    'relative flex items-center px-4 text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-300',
                                    isCurrentUrl(item.href) &&
                                        'font-semibold text-primary dark:text-primary',
                                )}
                            >
                                {item.title}
                                {isCurrentUrl(item.href) && (
                                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-tec-verde" />
                                )}
                            </Link>
                        ))}
                    </nav>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="ml-auto size-11 rounded-full bg-accent p-0 hover:bg-accent/70 lg:ml-4"
                                aria-label="Menú de usuario"
                            >
                                <Avatar className="size-11 overflow-hidden rounded-full">
                                    <AvatarImage
                                        src={auth.user?.avatar}
                                        alt={auth.user?.name}
                                    />
                                    <AvatarFallback className="bg-accent text-primary">
                                        <UserRound className="size-6 fill-current" />
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64 overflow-hidden rounded-xl p-0"
                            align="end"
                        >
                            {auth.user && <UserMenuContent user={auth.user} />}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            {breadcrumbs.length > 1 && (
                <div className="border-b bg-card">
                    <div className="mx-auto flex h-11 items-center px-4 text-muted-foreground md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
