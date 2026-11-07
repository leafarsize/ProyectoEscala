import {
    Activity,
    AlertOctagon,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Info,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EscaneoVista } from '@/components/escaneo-detalle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type NivelConfig = {
    nivel: number;
    etiqueta: string;
    referencia: number;
    hasta: number | null;
    descripcion: string;
};

const ALTURA_GRAFICA_PX = 230; // Altura en píxeles del área del trazado

const formatoDiaMes = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const COLORES_NIVEL: Record<
    number,
    {
        barra: string;
        badge: string;
        texto: string;
    }
> = {
    0: {
        barra: 'bg-emerald-500 hover:bg-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        texto: 'text-emerald-700 dark:text-emerald-400',
    },
    1: {
        barra: 'bg-green-500 hover:bg-green-600',
        badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200',
        texto: 'text-green-700 dark:text-green-400',
    },
    2: {
        barra: 'bg-amber-400 hover:bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
        texto: 'text-amber-700 dark:text-amber-400',
    },
    3: {
        barra: 'bg-orange-500 hover:bg-orange-600',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200',
        texto: 'text-orange-700 dark:text-orange-400',
    },
    4: {
        barra: 'bg-red-500 hover:bg-red-600',
        badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200',
        texto: 'text-red-700 dark:text-red-400',
    },
    5: {
        barra: 'bg-rose-700 hover:bg-rose-800',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200',
        texto: 'text-rose-700 dark:text-rose-400',
    },
};

export function TratamientoHistograma({
    escaneos,
    niveles,
}: {
    escaneos: EscaneoVista[];
    niveles: NivelConfig[];
}) {
    const [escaneoActivo, setEscaneoActivo] = useState<number | null>(null);

    const datos = useMemo(() => {
        if (escaneos.length === 0) {
            return null;
        }

        const ordenados = [...escaneos].sort((a, b) => {
            const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
            const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
            return fechaA - fechaB || a.id - b.id;
        });

        const primer = ordenados[0];
        const ultimo = ordenados[ordenados.length - 1];
        const cambioTotal =
            ordenados.length > 1 ? ultimo.porcentaje - primer.porcentaje : null;

        // Escala del eje Y con holgura para que los números superiores no se corten
        const maxPorcentaje = Math.max(...ordenados.map((e) => e.porcentaje), 15);
        const yMax = Math.ceil((maxPorcentaje + 6) / 5) * 5;

        // Veredicto agronómico temporal
        let estado: 'efectivo' | 'moderado' | 'inefectivo' | 'inicial';
        let titulo: string;
        let descripcion: string;

        if (ordenados.length === 1) {
            estado = 'inicial';
            titulo = 'Primer registro de tallo';
            descripcion = `Escaneo inicial con ${primer.porcentaje.toFixed(1)}% de daño (${primer.etiqueta}). Agrega un segundo escaneo en otra fecha para comparar la efectividad.`;
        } else if (cambioTotal !== null && cambioTotal <= 0) {
            estado = 'efectivo';
            titulo = 'Tratamiento Funcionando (Daño detenido / contenido)';
            descripcion = `El daño se redujo o se contuvo en ${Math.abs(cambioTotal).toFixed(1)} pts (${primer.porcentaje.toFixed(1)}% → ${ultimo.porcentaje.toFixed(1)}%). El medicamento está frenando el avance.`;
        } else if (cambioTotal !== null && cambioTotal <= 2.5) {
            estado = 'moderado';
            titulo = 'Efectividad Moderada (Avance lento)';
            descripcion = `El daño aumentó ligeramente (+${cambioTotal.toFixed(1)} pts) entre fechas. Se recomienda continuar monitoreando los próximos tallos.`;
        } else {
            estado = 'inefectivo';
            titulo = 'Tratamiento No Funcionando (El daño está avanzando)';
            descripcion = `El daño aumentó +${cambioTotal?.toFixed(1)} pts (${primer.porcentaje.toFixed(1)}% → ${ultimo.porcentaje.toFixed(1)}%). La lesión sigue creciendo en los tallos evaluados.`;
        }

        return {
            ordenados,
            primer,
            ultimo,
            cambioTotal,
            yMax,
            estado,
            titulo,
            descripcion,
        };
    }, [escaneos]);

    if (!datos) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <BarChart3 className="size-8 opacity-40" />
                    <p className="font-medium">Sin datos temporales</p>
                    <p className="text-xs">
                        Agrega fotos de tallos a este tratamiento para ver la gráfica de daño en el tiempo.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { ordenados, primer, ultimo, cambioTotal, yMax, estado, titulo, descripcion } =
        datos;

    const estilos = {
        efectivo: {
            borde: 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20',
            badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
            icono: CheckCircle2,
            colorIcono: 'text-emerald-600 dark:text-emerald-400',
        },
        moderado: {
            borde: 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20',
            badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
            icono: AlertTriangle,
            colorIcono: 'text-amber-600 dark:text-amber-400',
        },
        inefectivo: {
            borde: 'border-l-red-500 bg-red-50/40 dark:bg-red-950/20',
            badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200',
            icono: AlertOctagon,
            colorIcono: 'text-red-600 dark:text-red-400',
        },
        inicial: {
            borde: 'border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20',
            badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
            icono: Info,
            colorIcono: 'text-blue-600 dark:text-blue-400',
        },
    }[estado];

    const IconoEstado = estilos.icono;

    // 5 Divisiones del eje Y (0%, 25%, 50%, 75%, 100% de yMax)
    const lineasY = [
        yMax,
        Math.round(yMax * 0.75),
        Math.round(yMax * 0.5),
        Math.round(yMax * 0.25),
        0,
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* 1. Tarjeta de Diagnóstico de Efectividad en el Tiempo */}
            <div
                className={cn(
                    'flex flex-col gap-3 rounded-lg border border-l-4 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5',
                    estilos.borde,
                )}
            >
                <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs">
                        <IconoEstado className={cn('size-6', estilos.colorIcono)} />
                    </span>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{titulo}</h3>
                            <Badge className={cn('rounded-full text-xs font-semibold', estilos.badge)}>
                                {estado === 'efectivo'
                                    ? 'Funcionando'
                                    : estado === 'moderado'
                                      ? 'Moderado'
                                      : estado === 'inefectivo'
                                        ? 'No funcionando'
                                        : 'Escaneo Inicial'}
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {descripcion}
                        </p>
                    </div>
                </div>

                {/* Resumen comparativo inicial vs último */}
                {cambioTotal !== null && (
                    <div className="flex shrink-0 items-center gap-4 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                        <div className="text-left sm:text-right">
                            <span className="text-xs text-muted-foreground">Evolución neta</span>
                            <div className="flex items-center gap-1.5 tabular-nums sm:justify-end">
                                {cambioTotal <= 0 ? (
                                    <TrendingDown className="size-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <TrendingUp className="size-4 text-red-600 dark:text-red-400" />
                                )}
                                <span
                                    className={cn(
                                        'text-lg font-bold',
                                        cambioTotal <= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400',
                                    )}
                                >
                                    {cambioTotal > 0 ? '+' : ''}
                                    {cambioTotal.toFixed(1)} pts
                                </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                                {primer.porcentaje.toFixed(1)}% → {ultimo.porcentaje.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Gráfica de Barras Temporales (Daño vs Tiempo) */}
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <BarChart3 className="size-4 text-primary" />
                            Evolución del daño en el tiempo
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Cada barra representa un tallo analizado en su fecha correspondiente y el porcentaje de daño que presentó.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2.5 rounded-full bg-emerald-500" />
                            Sano / Leve (&lt; 9%)
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2.5 rounded-full bg-amber-400" />
                            Moderado (9-23%)
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2.5 rounded-full bg-red-500" />
                            Severo (&gt; 23%)
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="pt-2">
                    <div className="overflow-x-auto pb-2">
                        <div className="min-w-[420px]">
                            {/* Fila principal: Eje Y + Área de trazado de barras */}
                            <div className="flex gap-2">
                                {/* Eje Y con etiquetas numéricas */}
                                <div
                                    className="relative flex w-10 shrink-0 text-right text-[11px] font-medium text-muted-foreground tabular-nums select-none"
                                    style={{ height: `${ALTURA_GRAFICA_PX}px` }}
                                >
                                    {lineasY.map((val) => (
                                        <span
                                            key={val}
                                            className="absolute right-1 leading-none"
                                            style={{
                                                bottom: `${(val / yMax) * 100}%`,
                                                transform: 'translateY(50%)',
                                            }}
                                        >
                                            {val}%
                                        </span>
                                    ))}
                                </div>

                                {/* Área de trazado (Plot Area) con altura fija exacta */}
                                <div
                                    className="relative flex-1 select-none"
                                    style={{ height: `${ALTURA_GRAFICA_PX}px` }}
                                >
                                    {/* Líneas guía horizontales punteadas */}
                                    {lineasY.map((val) => (
                                        <div
                                            key={val}
                                            className="pointer-events-none absolute inset-x-0 border-b border-border/40 border-dashed"
                                            style={{
                                                bottom: `${(val / yMax) * 100}%`,
                                            }}
                                        />
                                    ))}

                                    {/* Línea de umbral de daño tolerable (9% = Nivel 1) */}
                                    {yMax > 9 && (
                                        <div
                                            className="pointer-events-none absolute inset-x-0 z-10 border-b border-emerald-500/80 border-dashed"
                                            style={{
                                                bottom: `${(9 / yMax) * 100}%`,
                                            }}
                                        >
                                            <span className="absolute -top-3.5 right-1 rounded-xs bg-emerald-100 px-1 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
                                                Umbral Leve (9%)
                                            </span>
                                        </div>
                                    )}

                                    {/* Contenedor de las barras individuales alineadas al fondo */}
                                    <div className="relative z-20 flex h-full items-end justify-around gap-2 px-2 sm:gap-6">
                                        {ordenados.map((e, index) => {
                                            const fechaObj = e.fecha ? new Date(e.fecha) : null;
                                            const estiloNivel = COLORES_NIVEL[e.nivel] ?? COLORES_NIVEL[0];
                                            const esActivo = escaneoActivo === e.id;

                                            // Altura proporcional exacta en píxeles (mínimo 10px para que se distinga)
                                            const alturaBarraPx = Math.max(
                                                Math.round((e.porcentaje / yMax) * ALTURA_GRAFICA_PX),
                                                10,
                                            );

                                            // Comparación con el escaneo anterior
                                            const anterior = index > 0 ? ordenados[index - 1] : null;
                                            const difAnterior =
                                                anterior ? e.porcentaje - anterior.porcentaje : null;

                                            return (
                                                <div
                                                    key={e.id}
                                                    onClick={() =>
                                                        setEscaneoActivo(esActivo ? null : e.id)
                                                    }
                                                    className="group relative flex w-12 sm:w-16 flex-col items-center justify-end cursor-pointer"
                                                    style={{ height: `${ALTURA_GRAFICA_PX}px` }}
                                                >
                                                    {/* Valores numéricos arriba de la barra */}
                                                    <div className="mb-1.5 flex flex-col items-center transition-transform group-hover:scale-105">
                                                        {difAnterior !== null && (
                                                            <span
                                                                className={cn(
                                                                    'flex items-center text-[10px] font-bold tabular-nums',
                                                                    difAnterior <= 0
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : 'text-red-600 dark:text-red-400',
                                                                )}
                                                            >
                                                                {difAnterior <= 0 ? (
                                                                    <ArrowDownRight className="size-2.5" />
                                                                ) : (
                                                                    <ArrowUpRight className="size-2.5" />
                                                                )}
                                                                {difAnterior > 0 ? '+' : ''}
                                                                {difAnterior.toFixed(1)}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-bold tabular-nums text-foreground">
                                                            {e.porcentaje.toFixed(1)}%
                                                        </span>
                                                    </div>

                                                    {/* La barra física vertical */}
                                                    <div
                                                        className={cn(
                                                            'w-full rounded-t-lg transition-all duration-500 shadow-sm',
                                                            estiloNivel.barra,
                                                            esActivo ? 'ring-2 ring-primary ring-offset-2' : '',
                                                        )}
                                                        style={{ height: `${alturaBarraPx}px` }}
                                                    />

                                                    {/* Tarjeta flotante con detalles al hacer clic */}
                                                    {esActivo && (
                                                        <div className="absolute -top-24 z-30 w-44 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md">
                                                            <p className="font-semibold">
                                                                {e.numero_cana || `Tallo #${index + 1}`}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {fechaObj
                                                                    ? formatoFechaHora.format(fechaObj)
                                                                    : 'Sin fecha'}
                                                            </p>
                                                            <div className="mt-1 flex items-center justify-between border-t pt-1">
                                                                <span className="font-bold">
                                                                    {e.porcentaje.toFixed(1)}% daño
                                                                </span>
                                                                <Badge
                                                                    className={cn(
                                                                        'text-[10px] px-1 py-0',
                                                                        estiloNivel.badge,
                                                                    )}
                                                                >
                                                                    {e.etiqueta}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Línea base inferior del gráfico (eje X) */}
                            <div className="ml-10 border-t border-border" />

                            {/* Eje X: Etiquetas de fechas y número de caña exactamente alineadas */}
                            <div className="ml-10 flex justify-around gap-2 px-2 pt-2.5 sm:gap-6">
                                {ordenados.map((e, index) => {
                                    const fechaObj = e.fecha ? new Date(e.fecha) : null;
                                    const fechaTexto = fechaObj
                                        ? formatoDiaMes.format(fechaObj)
                                        : `Punto ${index + 1}`;

                                    return (
                                        <div
                                            key={e.id}
                                            className="flex w-12 sm:w-16 flex-col items-center text-center"
                                        >
                                            <span className="text-xs font-semibold whitespace-nowrap text-foreground">
                                                {fechaTexto}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate max-w-[65px]">
                                                {e.numero_cana || `Tallo ${index + 1}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
