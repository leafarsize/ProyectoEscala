import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, ScanLine } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    DetalleEscaneo,
    formatoDia,
    formatoFecha,
    NivelBadge,
} from '@/components/escaneo-detalle';
import type { EscaneoVista } from '@/components/escaneo-detalle';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { create } from '@/routes/escaneo';
import { index } from '@/routes/laboratorio/tratamientos';

type Tratamiento = {
    id: number;
    nombre: string;
    variedad: string;
    lote: string;
    fecha_inicio: string;
    estado: 'abierto' | 'cerrado';
    responsable: string;
    productor: string | null;
    notas: string | null;
    puede_agregar: boolean;
};

export default function DetalleTratamiento({
    tratamiento: t,
    escaneos,
    ultimoNivel,
}: {
    tratamiento: Tratamiento;
    escaneos: EscaneoVista[];
    ultimoNivel: number;
}) {
    const [abierto, setAbierto] = useState<number | null>(null);
    const inicial = escaneos[0];
    const ultimo = escaneos[escaneos.length - 1];
    const cambio =
        inicial && ultimo && escaneos.length > 1
            ? ultimo.porcentaje - inicial.porcentaje
            : null;

    return (
        <>
            <Head title={t.nombre} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="self-start"
                >
                    <Link href={index()}>
                        <ArrowLeft />
                        Tratamientos
                    </Link>
                </Button>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={t.nombre} />
                            <Badge
                                variant={
                                    t.estado === 'abierto'
                                        ? 'outline'
                                        : 'secondary'
                                }
                                className="mb-6"
                            >
                                {t.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                            </Badge>
                        </div>
                    </div>

                    {t.puede_agregar && (
                        <Button asChild>
                            <Link
                                href={create({ query: { tratamiento: t.id } })}
                            >
                                <ScanLine />
                                Agregar escaneo
                            </Link>
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <Dato titulo="Variedad" valor={t.variedad} />
                        <Dato titulo="Lote" valor={t.lote} />
                        <Dato
                            titulo="Inicio"
                            valor={formatoDia.format(new Date(t.fecha_inicio))}
                        />
                        <Dato titulo="Responsable" valor={t.responsable} />
                        {t.productor && (
                            <Dato titulo="Productor" valor={t.productor} />
                        )}
                        {inicial && ultimo && (
                            <Dato
                                titulo="Evolución del daño"
                                valor={
                                    cambio === null ? (
                                        `${ultimo.porcentaje.toFixed(1)} %`
                                    ) : (
                                        <span className="flex flex-wrap items-center gap-x-1.5 tabular-nums">
                                            <span className="whitespace-nowrap">
                                                {inicial.porcentaje.toFixed(1)}{' '}
                                                %
                                            </span>
                                            <ArrowRight className="size-3.5" />
                                            <span className="whitespace-nowrap">
                                                {ultimo.porcentaje.toFixed(1)} %
                                            </span>
                                            <span
                                                className={cn(
                                                    'whitespace-nowrap',
                                                    cambio > 0
                                                        ? 'text-destructive'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                ({cambio > 0 ? '+' : ''}
                                                {cambio.toFixed(1)} pts)
                                            </span>
                                        </span>
                                    )
                                }
                            />
                        )}
                        {t.notas && (
                            <Dato
                                titulo="Notas"
                                valor={t.notas}
                                className="sm:col-span-2 lg:col-span-4"
                            />
                        )}
                    </CardContent>
                </Card>

                <section className="flex flex-col gap-3">
                    <h2 className="font-semibold">
                        Escaneos ({escaneos.length})
                    </h2>

                    {escaneos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Este tratamiento todavía no tiene escaneos.
                        </p>
                    ) : (
                        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {escaneos.map((e, i) => (
                                <li key={e.id}>
                                    <TarjetaEscaneo
                                        escaneo={e}
                                        numero={i + 1}
                                        ultimoNivel={ultimoNivel}
                                        onAbrir={() => setAbierto(i)}
                                    />
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            <DetalleEscaneo
                escaneo={abierto === null ? null : (escaneos[abierto] ?? null)}
                titulo={
                    abierto === null ? undefined : nombreEscaneo(abierto + 1)
                }
                ultimoNivel={ultimoNivel}
                onCerrar={() => setAbierto(null)}
            />
        </>
    );
}

function nombreEscaneo(numero: number): string {
    return numero === 1 ? 'Escaneo 1 (inicio)' : `Escaneo ${numero}`;
}

function Dato({
    titulo,
    valor,
    className,
}: {
    titulo: string;
    valor: ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <p className="text-xs text-muted-foreground">{titulo}</p>
            <div className="font-medium">{valor}</div>
        </div>
    );
}

function TarjetaEscaneo({
    escaneo,
    numero,
    ultimoNivel,
    onAbrir,
}: {
    escaneo: EscaneoVista;
    numero: number;
    ultimoNivel: number;
    onAbrir: () => void;
}) {
    return (
        <Card className="h-full gap-0 overflow-hidden py-0">
            <button
                type="button"
                onClick={onAbrir}
                className="relative block bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label={`Ver ${nombreEscaneo(numero)}`}
            >
                <img
                    src={escaneo.imagen_resaltada}
                    alt="Tallo con las lesiones resaltadas en rojo"
                    loading="lazy"
                    className="mx-auto h-48 w-full object-contain"
                />
                <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
                    {nombreEscaneo(numero)}
                </span>
            </button>

            <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-2xl font-semibold whitespace-nowrap tabular-nums">
                        {escaneo.porcentaje.toFixed(1)}
                        <span className="text-sm text-muted-foreground">
                            {' '}
                            % de daño
                        </span>
                    </span>
                    <NivelBadge
                        nivel={escaneo.nivel}
                        ultimoNivel={ultimoNivel}
                    />
                </div>
                <p className="text-sm font-medium">{escaneo.etiqueta}</p>
                <p className="text-xs text-muted-foreground">
                    {formatoFecha.format(new Date(escaneo.fecha))} ·{' '}
                    {escaneo.usuario}
                </p>
            </CardContent>
        </Card>
    );
}

DetalleTratamiento.layout = {
    breadcrumbs: [
        {
            title: 'Tratamientos',
            href: index(),
        },
    ],
};
