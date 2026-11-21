import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Un tratamiento resumido, tal como lo envía ComparacionController */
export type TratamientoComparado = {
    id: number;
    nombre: string;
    temperatura: string | null;
    estado: 'abierto' | 'cerrado';
    responsable: string;
    fecha_inicio: string;
    /** Tallos analizados (n) */
    tallos: number;
    /** Daño promedio en porcentaje */
    promedio: number;
    /** Desviación estándar muestral; null con un solo tallo */
    desviacion: number | null;
    nivel: number;
    etiqueta: string;
};

/**
 * Alto del área de trazado: crece con la pantalla pero no se desborda en un
 * portátil ni se aplasta en un teléfono.
 */
const ALTURA = 'clamp(300px, 48vh, 480px)';

/** Ancho mínimo de cada columna: por debajo, el nombre deja de leerse */
const COLUMNA_MIN_PX = 88;

/**
 * Una barra por tratamiento con su daño promedio y, encima, la desviación estándar
 * como barra de error. Todas las barras son del mismo color porque son la misma
 * medida: lo que se compara es la altura, no la identidad de cada tratamiento.
 */
export function ComparacionBarras({
    tratamientos,
}: {
    tratamientos: TratamientoComparado[];
}) {
    const [activo, setActivo] = useState<number | null>(null);

    // El eje llega hasta el múltiplo de 5 por encima de la barra más alta con su
    // desviación, para que nada se corte arriba
    const techo = Math.max(
        ...tratamientos.map((t) => t.promedio + (t.desviacion ?? 0)),
        5,
    );
    // Un 10 % de aire por encima para que la etiqueta de la barra más alta quepa
    const yMax = Math.ceil((techo * 1.1 + 1) / 5) * 5;

    const lineas = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];
    const anchoMinimo = tratamientos.length * COLUMNA_MIN_PX;

    const destacado = tratamientos.find((t) => t.id === activo) ?? null;

    return (
        <div className="flex flex-col gap-2">
            {/* Lectura del tratamiento señalado. Va fuera del área de trazado porque
                el scroll horizontal recorta también en vertical: un globo flotante
                sobre las barras saldría cortado. El alto fijo evita que la gráfica
                salte al entrar y salir del puntero. */}
            <Lectura tratamiento={destacado} />

            <div
                role="img"
                aria-label={`Gráfica de barras con el daño promedio de ${tratamientos.length} tratamientos; las mismas cifras están en la tabla de abajo.`}
                className="overflow-x-auto pt-3 pb-2"
            >
                <div style={{ minWidth: `${anchoMinimo}px` }}>
                    <div className="flex gap-2">
                        {/* Eje Y */}
                        <div
                            className="relative w-11 shrink-0 text-right text-[11px] font-medium text-muted-foreground tabular-nums select-none"
                            style={{ height: ALTURA }}
                        >
                            {lineas.map((valor) => (
                                <span
                                    key={valor}
                                    className="absolute right-1 leading-none"
                                    style={{
                                        bottom: `${(valor / yMax) * 100}%`,
                                        transform: 'translateY(50%)',
                                    }}
                                >
                                    {valor.toFixed(yMax <= 10 ? 1 : 0)}%
                                </span>
                            ))}
                        </div>

                        {/* Área de trazado */}
                        <div
                            className="relative flex-1"
                            style={{ height: ALTURA }}
                        >
                            {lineas.map((valor) => (
                                <div
                                    key={valor}
                                    className="pointer-events-none absolute inset-x-0 border-b border-border"
                                    style={{
                                        bottom: `${(valor / yMax) * 100}%`,
                                    }}
                                />
                            ))}

                            <div className="absolute inset-0 flex items-end gap-2">
                                {tratamientos.map((t) => (
                                    <Barra
                                        key={t.id}
                                        tratamiento={t}
                                        yMax={yMax}
                                        activo={activo === t.id}
                                        onActivar={() => setActivo(t.id)}
                                        onSalir={() => setActivo(null)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Eje X: nombre del tratamiento y cuántos tallos lo sostienen */}
                    <div className="mt-2 flex gap-2">
                        <div className="w-11 shrink-0" />
                        <div className="flex flex-1 gap-2">
                            {tratamientos.map((t) => (
                                <div
                                    key={t.id}
                                    className="min-w-0 flex-1 text-center"
                                    title={t.nombre}
                                >
                                    <p className="line-clamp-2 text-xs leading-tight font-medium break-words">
                                        {t.nombre}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground tabular-nums">
                                        n = {t.tallos}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Cifras del tratamiento bajo el puntero. Sin puntero encima, explica la gráfica.
 */
function Lectura({
    tratamiento: t,
}: {
    tratamiento: TratamientoComparado | null;
}) {
    if (t === null) {
        return (
            <p className="h-9 text-xs text-muted-foreground">
                Pasa el puntero sobre una barra para ver sus cifras.
            </p>
        );
    }

    return (
        <p className="flex h-9 flex-wrap items-center gap-x-2 text-xs tabular-nums">
            <span className="font-semibold">{t.nombre}</span>
            <span>{t.promedio.toFixed(2)} % de daño promedio</span>
            <span className="text-muted-foreground">
                {t.desviacion === null
                    ? 'sin desviación (un solo tallo)'
                    : `± ${t.desviacion.toFixed(2)} de desviación`}
            </span>
            <span className="text-muted-foreground">
                {t.tallos} {t.tallos === 1 ? 'tallo' : 'tallos'} · Nivel{' '}
                {t.nivel} ({t.etiqueta})
            </span>
        </p>
    );
}

function Barra({
    tratamiento: t,
    yMax,
    activo,
    onActivar,
    onSalir,
}: {
    tratamiento: TratamientoComparado;
    yMax: number;
    activo: boolean;
    onActivar: () => void;
    onSalir: () => void;
}) {
    const alto = (t.promedio / yMax) * 100;

    // La barra de error se recorta en 0: un daño negativo no existe
    const desde = Math.max(t.promedio - (t.desviacion ?? 0), 0);
    const hasta = t.promedio + (t.desviacion ?? 0);

    return (
        <div
            className="relative flex h-full min-w-0 flex-1 items-end justify-center"
            onMouseEnter={onActivar}
            onMouseLeave={onSalir}
        >
            {/* Barra: extremo superior redondeado, base recta sobre el eje */}
            <div
                className={cn(
                    'w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity',
                    activo && 'opacity-80',
                )}
                style={{ height: `${alto}%` }}
            />

            {/* Desviación estándar: línea vertical con topes, como en la literatura */}
            {t.desviacion !== null && (
                <div
                    className="pointer-events-none absolute left-1/2 w-3 -translate-x-1/2"
                    style={{
                        bottom: `${(desde / yMax) * 100}%`,
                        height: `${((hasta - desde) / yMax) * 100}%`,
                    }}
                >
                    <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/70" />
                    <span className="absolute inset-x-0 top-0 h-px bg-foreground/70" />
                    <span className="absolute inset-x-0 bottom-0 h-px bg-foreground/70" />
                </div>
            )}

            {/* Valor sobre la barra */}
            <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums"
                style={{
                    bottom: `calc(${(hasta / yMax) * 100}% + 4px)`,
                }}
            >
                {t.promedio.toFixed(1)}
            </span>
        </div>
    );
}
