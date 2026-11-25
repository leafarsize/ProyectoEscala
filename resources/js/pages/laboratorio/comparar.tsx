import { Head, Link, router } from '@inertiajs/react';
import { BarChart3, FileSpreadsheet, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    ComparacionBarras,
    type TratamientoComparado,
} from '@/components/comparacion-barras';
import { formatoDia, NivelBadge } from '@/components/escaneo-detalle';
import { FiltroFechas } from '@/components/filtro-fechas';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    exportar as exportarComparacion,
    index as comparar,
} from '@/routes/laboratorio/comparar';
import {
    index as tratamientos,
    show as verTratamiento,
} from '@/routes/laboratorio/tratamientos';

type Filtros = {
    buscar: string;
    /** Rango por fecha de inicio del tratamiento (AAAA-MM-DD) */
    desde: string;
    hasta: string;
    estado: 'todos' | 'abierto' | 'cerrado';
    orden: 'promedio' | 'fecha';
};

export default function Comparar({
    tratamientos: candidatos,
    sinTallos,
    filtros,
    ultimoNivel,
    maximoSeleccion,
}: {
    /** Tratamientos que pasan el filtro y tienen al menos un tallo */
    tratamientos: TratamientoComparado[];
    /** Los que pasan el filtro pero todavía no tienen tallos escaneados */
    sinTallos: number;
    filtros: Filtros;
    ultimoNivel: number;
    maximoSeleccion: number;
}) {
    const [buscar, setBuscar] = useState(filtros.buscar);
    const [seleccionados, setSeleccionados] = useState<number[]>(() =>
        candidatos.slice(0, maximoSeleccion).map((t) => t.id),
    );

    const consultar = (cambios: Partial<Filtros>) => {
        // Los filtros del servidor, pisados por lo que se escribe y por el cambio
        const siguiente = { ...filtros, buscar, ...cambios };

        router.get(
            comparar.url({
                query: {
                    ...(siguiente.buscar ? { buscar: siguiente.buscar } : {}),
                    ...(siguiente.desde ? { desde: siguiente.desde } : {}),
                    ...(siguiente.hasta ? { hasta: siguiente.hasta } : {}),
                    ...(siguiente.estado !== 'todos'
                        ? { estado: siguiente.estado }
                        : {}),
                    ...(siguiente.orden !== 'promedio'
                        ? { orden: siguiente.orden }
                        : {}),
                },
            }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Buscar mientras se escribe, con la misma espera que el historial
    useEffect(() => {
        // Igual que en el historial: comparar contra lo que ya aplicó el
        // servidor, en vez de un guard de primer render que StrictMode consume
        // en su ejecución descartada
        if (buscar === filtros.buscar) {
            return;
        }

        const temporizador = setTimeout(() => consultar({ buscar }), 300);

        return () => clearTimeout(temporizador);
    }, [buscar, filtros.buscar]);

    // Al cambiar el filtro llega otra lista: se conserva lo que siga estando y,
    // si no queda nada marcado, se vuelve a proponer una selección por defecto
    useEffect(() => {
        setSeleccionados((previos) => {
            const disponibles = new Set(candidatos.map((t) => t.id));
            const conservados = previos.filter((id) => disponibles.has(id));

            return conservados.length > 0
                ? conservados
                : candidatos.slice(0, maximoSeleccion).map((t) => t.id);
        });
    }, [candidatos, maximoSeleccion]);

    const alternar = (id: number) => {
        setSeleccionados((previos) => {
            if (previos.includes(id)) {
                return previos.filter((otro) => otro !== id);
            }

            // El tope existe para que la gráfica siga siendo legible
            return previos.length >= maximoSeleccion
                ? previos
                : [...previos, id];
        });
    };

    const graficados = candidatos.filter((t) => seleccionados.includes(t.id));
    const enElTope = seleccionados.length >= maximoSeleccion;
    const tieneFiltros = Boolean(
        filtros.buscar ||
        filtros.desde ||
        filtros.hasta ||
        filtros.estado !== 'todos',
    );

    const limpiarFiltros = () => {
        setBuscar('');
        router.get(
            comparar.url(),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Comparar tratamientos" />

            <div className="flex h-full flex-1 flex-col gap-6 p-5 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Comparar tratamientos"
                        description="Daño promedio de cada tratamiento con su desviación estándar."
                    />
                    {graficados.length > 0 && (
                        <Button variant="outline" asChild>
                            <a
                                href={exportarComparacion.url({
                                    query: {
                                        ...(filtros.buscar
                                            ? { buscar: filtros.buscar }
                                            : {}),
                                        ...(filtros.desde
                                            ? { desde: filtros.desde }
                                            : {}),
                                        ...(filtros.hasta
                                            ? { hasta: filtros.hasta }
                                            : {}),
                                        ...(filtros.estado !== 'todos'
                                            ? { estado: filtros.estado }
                                            : {}),
                                        ...(filtros.orden !== 'promedio'
                                            ? { orden: filtros.orden }
                                            : {}),
                                        // Se exporta justo lo que está en la gráfica
                                        ids: seleccionados.join(','),
                                    },
                                })}
                                download
                            >
                                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                Exportar a Excel
                            </a>
                        </Button>
                    )}
                </div>

                {/* Filtros: dos columnas, cada campo con su etiqueta encima */}
                <Card>
                    <CardContent className="p-4">
                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                consultar({ buscar });
                            }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            <div className="grid gap-2">
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
                                            onClick={() => setBuscar('')}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                                            title="Borrar texto"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="estado">Estado</Label>
                                <Select
                                    value={filtros.estado}
                                    onValueChange={(valor) =>
                                        consultar({
                                            estado: valor as Filtros['estado'],
                                        })
                                    }
                                >
                                    <SelectTrigger
                                        id="estado"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">
                                            Abiertos y cerrados
                                        </SelectItem>
                                        <SelectItem value="abierto">
                                            Solo abiertos
                                        </SelectItem>
                                        <SelectItem value="cerrado">
                                            Solo cerrados
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <FiltroFechas
                                desde={filtros.desde}
                                hasta={filtros.hasta}
                                onCambio={consultar}
                                idPrefijo="comparar"
                            />

                            {tieneFiltros && (
                                <div className="flex justify-start sm:col-span-2 sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={limpiarFiltros}
                                    >
                                        <X className="size-4" />
                                        Limpiar filtros
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {candidatos.length === 0 ? (
                    <Vacio sinTallos={sinTallos} tieneFiltros={tieneFiltros} />
                ) : (
                    <>
                        <Seleccion
                            candidatos={candidatos}
                            seleccionados={seleccionados}
                            maximo={maximoSeleccion}
                            enElTope={enElTope}
                            onAlternar={alternar}
                            onTodos={() =>
                                setSeleccionados(
                                    candidatos
                                        .slice(0, maximoSeleccion)
                                        .map((t) => t.id),
                                )
                            }
                            onNinguno={() => setSeleccionados([])}
                        />

                        {graficados.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                    Marca al menos un tratamiento de la lista
                                    para compararlo.
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                                    <div>
                                        <p className="flex items-center gap-2 text-base font-semibold">
                                            <BarChart3 className="size-4 text-primary" />
                                            Daño promedio por tratamiento
                                        </p>
                                    </div>

                                    <ComparacionBarras
                                        tratamientos={graficados}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {graficados.length > 0 && (
                            <Tabla
                                tratamientos={graficados}
                                ultimoNivel={ultimoNivel}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}

/**
 * Lista para elegir qué tratamientos entran a la gráfica. El tope existe porque
 * con demasiadas barras los nombres del eje dejan de leerse.
 */
function Seleccion({
    candidatos,
    seleccionados,
    maximo,
    enElTope,
    onAlternar,
    onTodos,
    onNinguno,
}: {
    candidatos: TratamientoComparado[];
    seleccionados: number[];
    maximo: number;
    enElTope: boolean;
    onAlternar: (id: number) => void;
    onTodos: () => void;
    onNinguno: () => void;
}) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                        Tratamientos a comparar{' '}
                        <span className="text-muted-foreground tabular-nums">
                            ({seleccionados.length} de {candidatos.length}
                            {candidatos.length > maximo
                                ? `, máximo ${maximo}`
                                : ''}
                            )
                        </span>
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onTodos}>
                            {candidatos.length > maximo
                                ? `Marcar los primeros ${maximo}`
                                : 'Marcar todos'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onNinguno}>
                            Limpiar selección
                        </Button>
                    </div>
                </div>

                <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                    {candidatos.map((t) => {
                        const marcado = seleccionados.includes(t.id);

                        return (
                            <li key={t.id}>
                                <div className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
                                    <Checkbox
                                        id={`tratamiento-${t.id}`}
                                        checked={marcado}
                                        disabled={!marcado && enElTope}
                                        onCheckedChange={() => onAlternar(t.id)}
                                    />
                                    <Label
                                        htmlFor={`tratamiento-${t.id}`}
                                        className="min-w-0 flex-1 cursor-pointer font-normal"
                                        title={
                                            !marcado && enElTope
                                                ? `Ya hay ${maximo} marcados; desmarca uno para cambiarlo`
                                                : t.nombre
                                        }
                                    >
                                        <span className="block min-w-0">
                                            <span className="block truncate text-sm font-medium">
                                                {t.nombre}
                                            </span>
                                            <span className="block text-xs text-muted-foreground tabular-nums">
                                                {t.promedio.toFixed(1)} % ·{' '}
                                                {t.tallos}{' '}
                                                {t.tallos === 1
                                                    ? 'tallo'
                                                    : 'tallos'}
                                            </span>
                                        </span>
                                    </Label>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}

/**
 * Las mismas cifras de la gráfica, legibles y copiables. No es opcional: es lo
 * que hace la pantalla utilizable con lector de pantalla.
 */
function Tabla({
    tratamientos: lista,
    ultimoNivel,
}: {
    tratamientos: TratamientoComparado[];
    ultimoNivel: number;
}) {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <caption className="sr-only">
                            Daño promedio y desviación estándar de cada
                            tratamiento
                        </caption>
                        <thead className="border-b bg-muted/50 text-left text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-semibold">
                                    Tratamiento
                                </th>
                                <th className="px-4 py-3 text-right font-semibold">
                                    Tallos
                                </th>
                                <th className="px-4 py-3 text-right font-semibold">
                                    Daño promedio
                                </th>
                                <th className="px-4 py-3 text-right font-semibold">
                                    Desviación
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                    Nivel
                                </th>
                                <th className="hidden px-4 py-3 font-semibold lg:table-cell">
                                    Responsable
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((t) => (
                                <tr
                                    key={t.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="px-4 py-3">
                                        <Link
                                            href={verTratamiento(t.id)}
                                            className="font-medium hover:underline"
                                        >
                                            {t.nombre}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">
                                            {[
                                                t.temperatura,
                                                `desde ${formatoDia.format(new Date(t.fecha_inicio))}`,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            {t.estado === 'cerrado' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-2"
                                                >
                                                    Cerrado
                                                </Badge>
                                            )}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {t.tallos}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                        {t.promedio.toFixed(2)} %
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        {t.desviacion === null ? (
                                            <span
                                                className="text-muted-foreground"
                                                title="Hace falta más de un tallo para calcular la desviación"
                                            >
                                                —
                                            </span>
                                        ) : (
                                            `± ${t.desviacion.toFixed(2)}`
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <NivelBadge
                                            nivel={t.nivel}
                                            ultimoNivel={ultimoNivel}
                                        />
                                    </td>
                                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                                        {t.responsable}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function Vacio({
    sinTallos,
    tieneFiltros,
}: {
    sinTallos: number;
    tieneFiltros: boolean;
}) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <BarChart3 className="size-8 opacity-40" />
                <p className="font-medium">No hay nada que comparar todavía</p>
                <p className="text-xs">
                    {sinTallos > 0
                        ? `Hay ${sinTallos} ${sinTallos === 1 ? 'tratamiento' : 'tratamientos'} sin tallos escaneados. Escanea al menos un tallo para que aparezcan aquí.`
                        : tieneFiltros
                          ? 'Ningún tratamiento coincide con los filtros. Prueba con otro rango de fechas o borra la búsqueda.'
                          : 'Inicia un tratamiento y escanea al menos un tallo.'}
                </p>
            </CardContent>
        </Card>
    );
}

Comparar.layout = {
    breadcrumbs: [{ title: 'Tratamientos', href: tratamientos() }],
};
