import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    FlaskConical,
    Images,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { formatoDia, NivelBadge } from '@/components/escaneo-detalle';
import type { EscaneoVista } from '@/components/escaneo-detalle';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { create } from '@/routes/escaneo';
import { index, show } from '@/routes/laboratorio/tratamientos';

type TratamientoResumen = {
    id: number;
    nombre: string;
    variedad: string;
    lote: string;
    fecha_inicio: string;
    estado: 'abierto' | 'cerrado';
    responsable: string;
    escaneos: number;
    porcentaje_inicial: number | null;
    ultimo: EscaneoVista | null;
};

type Paginado<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export default function Tratamientos({
    tratamientos,
    ultimoNivel,
}: {
    tratamientos: Paginado<TratamientoResumen>;
    ultimoNivel: number;
}) {
    return (
        <>
            <Head title="Tratamientos" />
            <div className="flex h-full flex-1 flex-col gap-6 p-5 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Tratamientos"
                        description="Historial de tratamientos y la evolución del daño en cada uno."
                    />
                    <Button asChild>
                        <Link href={create()}>Nuevo tratamiento</Link>
                    </Button>
                </div>

                {tratamientos.data.length === 0 ? (
                    <SinTratamientos />
                ) : (
                    <>
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {tratamientos.data.map((t) => (
                                <li key={t.id}>
                                    <TarjetaTratamiento
                                        tratamiento={t}
                                        ultimoNivel={ultimoNivel}
                                    />
                                </li>
                            ))}
                        </ul>

                        <Paginacion pagina={tratamientos} />
                    </>
                )}
            </div>
        </>
    );
}

function SinTratamientos() {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <FlaskConical className="size-5 text-muted-foreground" />
                </span>
                <p className="font-medium">Todavía no hay tratamientos</p>
                <p className="text-sm text-muted-foreground">
                    El primer escaneo de un tallo inicia un tratamiento.
                </p>
                <Button asChild>
                    <Link href={create()}>Escanear un tallo</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function TarjetaTratamiento({
    tratamiento: t,
    ultimoNivel,
}: {
    tratamiento: TratamientoResumen;
    ultimoNivel: number;
}) {
    const cambio =
        t.ultimo && t.porcentaje_inicial !== null && t.escaneos > 1
            ? t.ultimo.porcentaje - t.porcentaje_inicial
            : null;

    return (
        <Link
            href={show(t.id)}
            className="block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            <Card className="h-full gap-0 overflow-hidden py-0 transition-colors hover:bg-muted/40">
                <div className="relative bg-muted">
                    {t.ultimo ? (
                        <img
                            src={t.ultimo.imagen_resaltada}
                            alt={`Último escaneo de ${t.nombre}`}
                            loading="lazy"
                            className="mx-auto h-44 w-full object-contain"
                        />
                    ) : (
                        <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                            Sin escaneos
                        </div>
                    )}
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
                        <Images className="size-3.5" />
                        {t.escaneos} {t.escaneos === 1 ? 'escaneo' : 'escaneos'}
                    </span>
                    {t.estado === 'cerrado' && (
                        <Badge
                            variant="secondary"
                            className="absolute top-2 right-2"
                        >
                            Cerrado
                        </Badge>
                    )}
                </div>

                <CardContent className="flex flex-col gap-2 p-4">
                    <p className="leading-tight font-semibold">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                        {t.variedad} · {t.lote} · desde{' '}
                        {formatoDia.format(new Date(t.fecha_inicio))}
                    </p>

                    {t.ultimo && (
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <Evolucion
                                inicial={t.porcentaje_inicial}
                                actual={t.ultimo.porcentaje}
                                cambio={cambio}
                            />
                            <NivelBadge
                                nivel={t.ultimo.nivel}
                                ultimoNivel={ultimoNivel}
                            />
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Responsable: {t.responsable}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
}

function Evolucion({
    inicial,
    actual,
    cambio,
}: {
    inicial: number | null;
    actual: number;
    cambio: number | null;
}) {
    if (cambio === null || inicial === null) {
        return (
            <span className="text-lg font-semibold whitespace-nowrap tabular-nums">
                {actual.toFixed(1)}
                <span className="text-sm text-muted-foreground">
                    {' '}
                    % de daño
                </span>
            </span>
        );
    }

    return (
        <span className="flex items-center gap-1.5 text-sm whitespace-nowrap tabular-nums">
            <span className="text-muted-foreground">
                {inicial.toFixed(1)} %
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span className="text-lg font-semibold">{actual.toFixed(1)} %</span>
            <span
                className={
                    cambio > 0
                        ? 'text-xs text-destructive'
                        : 'text-xs text-muted-foreground'
                }
            >
                ({cambio > 0 ? '+' : ''}
                {cambio.toFixed(1)})
            </span>
        </span>
    );
}

function Paginacion({ pagina }: { pagina: Paginado<TratamientoResumen> }) {
    if (pagina.last_page <= 1) {
        return (
            <p className="text-sm text-muted-foreground">
                {pagina.total}{' '}
                {pagina.total === 1 ? 'tratamiento' : 'tratamientos'}
            </p>
        );
    }

    return (
        <nav
            aria-label="Paginación"
            className="flex items-center justify-between gap-2"
        >
            <p className="text-sm text-muted-foreground">
                {pagina.from}–{pagina.to} de {pagina.total} tratamientos
            </p>
            <div className="flex gap-2">
                <BotonPagina url={pagina.prev_page_url} etiqueta="Anterior">
                    <ChevronLeft />
                </BotonPagina>
                <BotonPagina url={pagina.next_page_url} etiqueta="Siguiente">
                    <ChevronRight />
                </BotonPagina>
            </div>
        </nav>
    );
}

function BotonPagina({
    url,
    etiqueta,
    children,
}: {
    url: string | null;
    etiqueta: string;
    children: ReactNode;
}) {
    if (!url) {
        return (
            <Button
                variant="outline"
                size="icon"
                disabled
                aria-label={etiqueta}
            >
                {children}
            </Button>
        );
    }

    return (
        <Button variant="outline" size="icon" asChild>
            <Link href={url} aria-label={etiqueta}>
                {children}
            </Link>
        </Button>
    );
}

Tratamientos.layout = {
    breadcrumbs: [
        {
            title: 'Tratamientos',
            href: index(),
        },
    ],
};
