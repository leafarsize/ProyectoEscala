import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    FlaskConical,
    Images,
    Power,
    Search,
    User,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { formatoDia, NivelBadge } from '@/components/escaneo-detalle';
import { FiltroFechas } from '@/components/filtro-fechas';
import type { EscaneoVista } from '@/components/escaneo-detalle';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { create } from '@/routes/escaneo';
import { exportar, index, show } from '@/routes/laboratorio/tratamientos';

type TratamientoResumen = {
    id: number;
    nombre: string;
    temperatura: string | null;
    /** null en los tratamientos creados sin estos datos */
    variedad: string | null;
    lote: string | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    duracion_dias: number | null;
    estado: 'abierto' | 'cerrado';
    responsable: string;
    escaneos: number;
    /** Daño promedio de todos los tallos; null si aún no hay ninguno */
    promedio: number | null;
    /** Desviación estándar muestral; null con menos de dos tallos */
    desviacion: number | null;
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

type Filtros = {
    buscar: string;
    laboratorista: string;
    /** Rango por fecha de inicio del tratamiento (AAAA-MM-DD) */
    desde: string;
    hasta: string;
};

export default function Tratamientos({
    tratamientos,
    ultimoNivel,
    filtros = { buscar: '', laboratorista: '', desde: '', hasta: '' },
    laboratoristas = [],
    puedeFiltrarPorLaboratorista = false,
    paginar = true,
}: {
    tratamientos: Paginado<TratamientoResumen>;
    ultimoNivel: number;
    filtros?: Filtros;
    laboratoristas?: string[];
    /** Solo el Jefe de laboratorio ve tratamientos de otras personas */
    puedeFiltrarPorLaboratorista?: boolean;
    /** false: todos de corrido, sin repartir en páginas */
    paginar?: boolean;
}) {
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [laboratorista, setLaboratorista] = useState(
        filtros.laboratorista || '',
    );

    const tieneFiltros = Boolean(
        filtros.buscar ||
        filtros.laboratorista ||
        filtros.desde ||
        filtros.hasta,
    );

    /**
     * Consulta con los filtros que ya aplicó el servidor, pisados por lo que se
     * está escribiendo y por el cambio que llega. Así tocar una fecha no borra
     * la búsqueda a medio teclear, ni al revés.
     */
    const consultar = (
        cambios: Partial<Filtros> & { paginar?: boolean } = {},
    ) => {
        const siguiente = {
            ...filtros,
            buscar,
            laboratorista,
            paginar,
            ...cambios,
        };

        router.get(
            index.url({
                query: {
                    ...(siguiente.buscar ? { buscar: siguiente.buscar } : {}),
                    ...(siguiente.laboratorista
                        ? { laboratorista: siguiente.laboratorista }
                        : {}),
                    ...(siguiente.desde ? { desde: siguiente.desde } : {}),
                    ...(siguiente.hasta ? { hasta: siguiente.hasta } : {}),
                    // Paginar es lo normal; solo viaja en la URL cuando se apaga
                    ...(siguiente.paginar ? {} : { paginar: '0' }),
                },
            }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    // Filtrar automáticamente al escribir en el campo de búsqueda (debounce 300 ms)
    useEffect(() => {
        // Solo se consulta cuando lo escrito difiere de lo que ya aplicó el
        // servidor. Un guard de "primer render" con useRef no sirve: en
        // desarrollo StrictMode ejecuta el efecto dos veces y la segunda se
        // colaba como búsqueda real, navegando a una URL sin "page" y
        // devolviendo a la página 1 recién llegados a la 2.
        if (buscar === filtros.buscar) {
            return;
        }

        const timer = setTimeout(() => {
            consultar({ buscar });
        }, 300);

        return () => clearTimeout(timer);
    }, [buscar, filtros.buscar]);

    const manejarSubmit = (e: FormEvent) => {
        e.preventDefault();
        consultar({ buscar });
    };

    const limpiarFiltros = () => {
        setBuscar('');
        setLaboratorista('');
        router.get(index.url(), {}, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Tratamientos" />
            <div className="flex h-full flex-1 flex-col gap-6 p-5 md:p-8">
                {/* Cabecera y botón nuevo */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        as="h1"
                        title="Tratamientos"
                        description="Historial de tratamientos"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={exportar.url({
                                    query: {
                                        ...(filtros.buscar
                                            ? { buscar: filtros.buscar }
                                            : {}),
                                        ...(filtros.laboratorista
                                            ? {
                                                  laboratorista:
                                                      filtros.laboratorista,
                                              }
                                            : {}),
                                        ...(filtros.desde
                                            ? { desde: filtros.desde }
                                            : {}),
                                        ...(filtros.hasta
                                            ? { hasta: filtros.hasta }
                                            : {}),
                                    },
                                })}
                                download
                            >
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                Exportar a Excel
                            </a>
                        </Button>
                        <Button asChild>
                            <Link href={create()}>Nuevo tratamiento</Link>
                        </Button>
                    </div>
                </div>

                {/* Filtros: dos columnas, cada campo con su etiqueta encima */}
                <Card>
                    <CardContent className="p-4">
                        <form
                            onSubmit={manejarSubmit}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            {/* 1. Filtro por nombre de tratamiento. Sin el filtro
                                de laboratorista ocupa la fila entera, para que no
                                quede un hueco al lado */}
                            <div
                                className={
                                    puedeFiltrarPorLaboratorista
                                        ? 'grid gap-2'
                                        : 'grid gap-2 sm:col-span-2'
                                }
                            >
                                <Label htmlFor="buscar">
                                    Buscar tratamiento
                                </Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="buscar"
                                        value={buscar}
                                        onChange={(e) =>
                                            setBuscar(e.target.value)
                                        }
                                        placeholder="Nombre del tratamiento..."
                                        className="pr-9 pl-9"
                                    />
                                    {buscar && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBuscar('');
                                                consultar({ buscar: '' });
                                            }}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                                            title="Borrar texto"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 2. Filtro por laboratorista (solo el Jefe) */}
                            {puedeFiltrarPorLaboratorista && (
                                <div className="grid gap-2">
                                    <Label htmlFor="laboratorista">
                                        Laboratorista
                                    </Label>
                                    <Select
                                        value={laboratorista || 'todos'}
                                        onValueChange={(val) => {
                                            const nuevo =
                                                val === 'todos' ? '' : val;
                                            setLaboratorista(nuevo);
                                            consultar({
                                                laboratorista: nuevo,
                                            });
                                        }}
                                    >
                                        <SelectTrigger
                                            id="laboratorista"
                                            className="w-full"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <User className="size-4 text-muted-foreground" />
                                                <SelectValue placeholder="Todos los laboratoristas" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">
                                                Todos los laboratoristas
                                            </SelectItem>
                                            {laboratoristas.map((nombre) => (
                                                <SelectItem
                                                    key={nombre}
                                                    value={nombre}
                                                >
                                                    {nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* 3. Rango por fecha de inicio, el mismo control que usa Comparar */}
                            <FiltroFechas
                                desde={filtros.desde}
                                hasta={filtros.hasta}
                                onCambio={consultar}
                                idPrefijo="historial"
                            />

                            {/* Buscar y limpiar, en su propia fila */}
                            <div className="flex items-center gap-2 sm:col-span-2">
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    className="px-4"
                                >
                                    Buscar
                                </Button>
                                {tieneFiltros && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={limpiarFiltros}
                                    >
                                        <X className="size-4" />
                                        Limpiar filtros
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Encendido de la paginación, justo debajo de los filtros */}
                <Toggle
                    variant="outline"
                    pressed={paginar}
                    onPressedChange={(valor) => consultar({ paginar: valor })}
                    title={
                        paginar
                            ? 'Paginación activada. Clic para ver todos los tratamientos de corrido.'
                            : 'Paginación desactivada: se ven todos. Clic para repartirlos en páginas.'
                    }
                    className="w-fit px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                    <Power className="size-4" />
                    Paginación
                </Toggle>

                {/* Listado de Tratamientos o estado vacío */}
                {tratamientos.data.length === 0 ? (
                    <SinTratamientos
                        tieneFiltros={tieneFiltros}
                        onLimpiar={limpiarFiltros}
                    />
                ) : (
                    <Card>
                        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
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

                            <PieListado
                                pagina={tratamientos}
                                paginar={paginar}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

function SinTratamientos({
    tieneFiltros = false,
    onLimpiar,
}: {
    tieneFiltros?: boolean;
    onLimpiar?: () => void;
}) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                    {tieneFiltros ? (
                        <Search className="size-5 text-muted-foreground" />
                    ) : (
                        <FlaskConical className="size-5 text-muted-foreground" />
                    )}
                </span>
                <p className="font-medium">
                    {tieneFiltros
                        ? 'No se encontraron tratamientos con los filtros aplicados'
                        : 'Todavía no hay tratamientos'}
                </p>
                <p className="text-sm text-muted-foreground">
                    {tieneFiltros
                        ? 'Intenta buscar con otros términos o limpia los filtros de búsqueda.'
                        : 'El primer escaneo de un tallo inicia un tratamiento.'}
                </p>
                {tieneFiltros ? (
                    <Button variant="outline" onClick={onLimpiar}>
                        Limpiar filtros
                    </Button>
                ) : (
                    <Button asChild>
                        <Link href={create()}>Escanear un tallo</Link>
                    </Button>
                )}
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
                        {[
                            t.variedad,
                            t.lote,
                            `desde ${formatoDia.format(new Date(t.fecha_inicio))}`,
                            t.duracion_dias !== null
                                ? `${t.duracion_dias} ${t.duracion_dias === 1 ? 'día' : 'días'}`
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>

                    {t.ultimo && t.promedio !== null && (
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <Promedio
                                promedio={t.promedio}
                                desviacion={t.desviacion}
                                tallos={t.escaneos}
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

/**
 * Daño promedio del tratamiento con su desviación estándar. Sustituye a la
 * evolución inicial -> actual: lo que compara el laboratorio es el promedio.
 */
function Promedio({
    promedio,
    desviacion,
    tallos,
}: {
    promedio: number;
    desviacion: number | null;
    tallos: number;
}) {
    return (
        <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm whitespace-nowrap tabular-nums">
            <span className="text-lg font-semibold">
                {promedio.toFixed(1)} %
            </span>
            {desviacion !== null && (
                <span className="text-xs text-muted-foreground">
                    ± {desviacion.toFixed(1)}
                </span>
            )}
            <span className="text-xs text-muted-foreground">
                promedio de {tallos} {tallos === 1 ? 'tallo' : 'tallos'}
            </span>
        </span>
    );
}

/**
 * Pie del listado: solo las flechas para cambiar de página. Sin paginación
 * encendida, o con una sola página, no se dibuja nada.
 */
function PieListado({
    pagina,
    paginar,
}: {
    pagina: Paginado<TratamientoResumen>;
    paginar: boolean;
}) {
    if (!paginar || pagina.last_page <= 1) {
        return null;
    }

    return (
        <nav
            aria-label="Paginación"
            className="flex items-center justify-center gap-3 border-t pt-4"
        >
            <BotonPagina url={pagina.prev_page_url} etiqueta="Página anterior">
                <ChevronLeft />
            </BotonPagina>
            <span className="text-sm text-muted-foreground tabular-nums">
                {pagina.current_page} de {pagina.last_page}
            </span>
            <BotonPagina url={pagina.next_page_url} etiqueta="Página siguiente">
                <ChevronRight />
            </BotonPagina>
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
