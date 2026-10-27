import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, ScanLine, Trash2, Undo2 } from 'lucide-react';
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
import { Seccion } from '@/components/seccion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { create } from '@/routes/escaneo';
import { destroy, index } from '@/routes/laboratorio/tratamientos';

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
    puede_eliminar: boolean;
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
            <div className="flex h-full flex-1 flex-col gap-6 p-5 md:p-8">
                <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="-mb-2 self-start"
                >
                    <Link href={index()} aria-label="Volver a tratamientos">
                        <Undo2 className="size-5" />
                    </Link>
                </Button>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Heading title={t.nombre} />
                        <Badge
                            className={cn(
                                'rounded-full border-transparent',
                                t.estado === 'abierto'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                            )}
                        >
                            {t.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {t.puede_agregar && (
                            <Button asChild>
                                <Link
                                    href={create({
                                        query: { tratamiento: t.id },
                                    })}
                                >
                                    <ScanLine />
                                    Agregar escaneo
                                </Link>
                            </Button>
                        )}
                        {t.puede_eliminar && (
                            <BotonEliminar
                                id={t.id}
                                nombre={t.nombre}
                                escaneos={escaneos.length}
                            />
                        )}
                    </div>
                </div>

                <Seccion titulo="Información del tratamiento">
                    <div className="grid gap-4 rounded-lg border border-l-4 border-l-primary bg-card p-4 text-sm shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
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
                    </div>
                </Seccion>

                <Seccion titulo={`Escaneos (${escaneos.length})`}>
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
                </Seccion>
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

function BotonEliminar({
    id,
    nombre,
    escaneos,
}: {
    id: number;
    nombre: string;
    escaneos: number;
}) {
    const [abierto, setAbierto] = useState(false);
    const [procesando, setProcesando] = useState(false);

    const eliminar = () => {
        router.delete(destroy(id).url, {
            preserveScroll: true,
            onStart: () => setProcesando(true),
            onFinish: () => setProcesando(false),
            onSuccess: () => setAbierto(false),
        });
    };

    return (
        <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 />
                    Eliminar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Eliminar «{nombre}»?</DialogTitle>
                    <DialogDescription>
                        Se borrarán el tratamiento y sus {escaneos}{' '}
                        {escaneos === 1 ? 'escaneo' : 'escaneos'} con sus
                        imágenes. Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        disabled={procesando}
                        onClick={eliminar}
                    >
                        {procesando && <Spinner />}
                        Eliminar tratamiento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
            <p className="text-xs font-semibold text-tec-marino dark:text-muted-foreground">
                {titulo}
            </p>
            <div className="text-slate-600 dark:text-foreground">{valor}</div>
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
