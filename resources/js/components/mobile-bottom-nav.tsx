import { Link, router, usePage } from '@inertiajs/react';
import {
    Camera,
    ClipboardList,
    LayoutGrid,
    LogOut,
    Settings,
    ShieldCheck,
    Sprout,
} from 'lucide-react';
import { useState } from 'react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard, logout } from '@/routes';
import { create as rutaEscanear } from '@/routes/escaneo';
import { index as rutaTratamientos } from '@/routes/laboratorio/tratamientos';
import { resultados as rutaResultados } from '@/routes/productor';
import { edit as rutaPerfil } from '@/routes/profile';
import { edit as rutaSeguridad } from '@/routes/security';

export function MobileBottomNav() {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const getInitials = useInitials();
    const [sheetUsuarioAbierto, setSheetUsuarioAbierto] = useState(false);

    if (!auth?.user) {
        return null;
    }

    const esProductor = auth.user.rol === 'productor';
    const rutaTercerBoton = esProductor ? rutaResultados() : rutaTratamientos();
    const etiquetaTercerBoton = esProductor ? 'Resultados' : 'Tratamientos';
    const IconoTercerBoton = esProductor ? Sprout : ClipboardList;

    const handleClicEscanear = (e: React.MouseEvent) => {
        if (isCurrentUrl(rutaEscanear())) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('abrir-camara-visor'));
        }
    };

    const handleCerrarSesion = () => {
        setSheetUsuarioAbierto(false);
        router.post(logout.url());
    };

    return (
        <>
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-md md:hidden">
                <div className="grid h-16 grid-cols-4 items-center">
                    {/* 1. Inicio */}
                    <Link
                        href={dashboard()}
                        prefetch
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 py-1 text-xs transition-colors',
                            isCurrentUrl(dashboard())
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <LayoutGrid className="size-5 shrink-0" />
                        <span className="truncate">Inicio</span>
                    </Link>

                    {/* 2. Escanear tallo */}
                    <Link
                        href={rutaEscanear({ query: { abrir_camara: 1 } })}
                        prefetch
                        onClick={handleClicEscanear}
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 py-1 text-xs transition-colors',
                            isCurrentUrl(rutaEscanear())
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full transition-transform',
                                isCurrentUrl(rutaEscanear())
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <Camera className="size-4 shrink-0" />
                        </span>
                        <span className="truncate">Escanear</span>
                    </Link>

                    {/* 3. Tratamientos */}
                    <Link
                        href={rutaTercerBoton}
                        prefetch
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 py-1 text-xs transition-colors',
                            isCurrentUrl(rutaTercerBoton)
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <IconoTercerBoton className="size-5 shrink-0" />
                        <span className="truncate">{etiquetaTercerBoton}</span>
                    </Link>

                    {/* 4. Usuario */}
                    <button
                        type="button"
                        onClick={() => setSheetUsuarioAbierto(true)}
                        className={cn(
                            'flex flex-col items-center justify-center gap-1 py-1 text-xs transition-colors',
                            sheetUsuarioAbierto
                                ? 'font-semibold text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Avatar className="size-5 shrink-0 border">
                            <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                                {getInitials(auth.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate">Usuario</span>
                    </button>
                </div>
            </nav>

            {/* Panel inferior deslizable (Sheet) para Usuario en móvil */}
            <Sheet
                open={sheetUsuarioAbierto}
                onOpenChange={setSheetUsuarioAbierto}
            >
                <SheetContent
                    side="bottom"
                    className="rounded-t-3xl border-t border-border bg-card p-6 pb-8 md:hidden"
                >
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12 border-2 border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <SheetTitle className="truncate text-base font-bold text-foreground">
                                        {auth.user.name}
                                    </SheetTitle>
                                    {auth.user.rol_etiqueta && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                        >
                                            {auth.user.rol_etiqueta}
                                        </Badge>
                                    )}
                                </div>
                                <SheetDescription className="truncate text-xs text-muted-foreground">
                                    {auth.user.email}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Opciones del menú móvil */}
                    <div className="mt-6 flex flex-col gap-2">
                        <Link
                            href={rutaPerfil()}
                            prefetch
                            onClick={() => setSheetUsuarioAbierto(false)}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
                        >
                            <Settings className="size-5 text-muted-foreground" />
                            <span>Configuración de cuenta</span>
                        </Link>

                        <Link
                            href={rutaSeguridad()}
                            prefetch
                            onClick={() => setSheetUsuarioAbierto(false)}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
                        >
                            <ShieldCheck className="size-5 text-muted-foreground" />
                            <span>Seguridad y llaves de acceso</span>
                        </Link>

                        {/* Selector de tema */}
                        <div className="flex items-center justify-between rounded-xl border bg-card p-3.5">
                            <span className="text-sm font-medium text-foreground">
                                Apariencia
                            </span>
                            <AppearanceToggleTab />
                        </div>

                        {/* Botón Cerrar Sesión */}
                        <Button
                            variant="destructive"
                            size="lg"
                            onClick={handleCerrarSesion}
                            className="mt-3 h-12 w-full rounded-xl text-sm font-semibold shadow-xs"
                        >
                            <LogOut className="mr-2 size-4" />
                            Cerrar sesión
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
