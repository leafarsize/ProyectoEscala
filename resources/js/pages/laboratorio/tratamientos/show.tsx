import { Form, Head, Link, router } from '@inertiajs/react';
import { FileSpreadsheet, Pencil, ScanLine, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import TratamientoController from '@/actions/App/Http/Controllers/TratamientoController';
import {
    DetalleEscaneo,
    formatoDia,
    formatoFecha,
    NivelBadge,
} from '@/components/escaneo-detalle';
import type { EscaneoVista } from '@/components/escaneo-detalle';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn, diasEntreFechas, validarRangoFechas } from '@/lib/utils';
import { create } from '@/routes/escaneo';
import { destroy as destroyEscaneo } from '@/routes/laboratorio/escaneos';
import {
    destroy,
    exportarDetalle,
    index,
} from '@/routes/laboratorio/tratamientos';

type Tratamiento = {
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
    productor: string | null;
    notas: string | null;
    /** Daño promedio de todos los tallos; null si aún no hay ninguno */
    promedio: number | null;
    /** Desviación estándar muestral; null con menos de dos tallos */
    desviacion: number | null;
    puede_agregar: boolean;
    puede_editar: boolean;
    puede_eliminar: boolean;
};

const clasesCampo =
    'w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function DetalleTratamiento({
    tratamiento: t,
    escaneos,
    ultimoNivel,
    temperaturas = [],
}: {
    tratamiento: Tratamiento;
    escaneos: EscaneoVista[];
    ultimoNivel: number;
    /** Opciones del formulario de edición (vacías si no se puede editar) */
    temperaturas?: string[];
}) {
    const [abierto, setAbierto] = useState<number | null>(null);
    const [editando, setEditando] = useState(false);
    // Índice del escaneo que se está por descartar, para confirmar antes de borrarlo
    const [porDescartar, setPorDescartar] = useState<number | null>(null);
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
                        <Heading as="h1" title={t.nombre} />
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
                        {escaneos.length > 0 && (
                            <Button variant="outline" asChild>
                                <a
                                    href={exportarDetalle.url({
                                        tratamiento: t.id,
                                    })}
                                    download
                                >
                                    <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    Exportar a Excel
                                </a>
                            </Button>
                        )}
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
                        {t.puede_editar && (
                            <Button
                                variant="outline"
                                onClick={() => setEditando(true)}
                            >
                                <Pencil className="size-4" />
                                Editar
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
                        {t.temperatura && (
                            <Dato titulo="Temperatura" valor={t.temperatura} />
                        )}
                        {t.variedad && (
                            <Dato titulo="Variedad" valor={t.variedad} />
                        )}
                        {t.lote && <Dato titulo="Lote" valor={t.lote} />}
                        <Dato
                            titulo="Inicio"
                            valor={formatoDia.format(new Date(t.fecha_inicio))}
                        />
                        {t.fecha_fin && (
                            <Dato
                                titulo="Término"
                                valor={formatoDia.format(new Date(t.fecha_fin))}
                            />
                        )}
                        {t.duracion_dias !== null && (
                            <Dato
                                titulo="Duración"
                                valor={`${t.duracion_dias} ${t.duracion_dias === 1 ? 'día' : 'días'}`}
                            />
                        )}
                        <Dato titulo="Responsable" valor={t.responsable} />
                        {t.productor && (
                            <Dato titulo="Productor" valor={t.productor} />
                        )}
                        {t.promedio !== null && (
                            <Dato
                                titulo="Daño promedio"
                                valor={
                                    <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                                        <span className="whitespace-nowrap">
                                            {t.promedio.toFixed(1)} %
                                        </span>
                                        {t.desviacion !== null && (
                                            <span className="whitespace-nowrap text-muted-foreground">
                                                ± {t.desviacion.toFixed(1)}
                                            </span>
                                        )}
                                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                                            en {escaneos.length}{' '}
                                            {escaneos.length === 1
                                                ? 'tallo'
                                                : 'tallos'}
                                        </span>
                                    </span>
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
                                        onDescartar={
                                            e.puede_eliminar
                                                ? () => setPorDescartar(i)
                                                : undefined
                                        }
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
                onEliminar={
                    abierto !== null && escaneos[abierto]?.puede_eliminar
                        ? () => {
                              // Se cierra el detalle y se pide confirmación
                              setPorDescartar(abierto);
                              setAbierto(null);
                          }
                        : undefined
                }
            />

            <DescartarEscaneo
                escaneo={
                    porDescartar === null
                        ? null
                        : (escaneos[porDescartar] ?? null)
                }
                numero={porDescartar === null ? 0 : porDescartar + 1}
                onCerrar={() => setPorDescartar(null)}
            />

            {t.puede_editar && (
                <Dialog
                    open={editando}
                    onOpenChange={(abrir) => !abrir && setEditando(false)}
                >
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                        <FormularioTratamiento
                            tratamiento={t}
                            temperaturas={temperaturas}
                            onCerrar={() => setEditando(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

/**
 * Formulario para corregir la ficha del tratamiento. Los escaneos no se tocan.
 */
function FormularioTratamiento({
    tratamiento: t,
    temperaturas,
    onCerrar,
}: {
    tratamiento: Tratamiento;
    temperaturas: string[];
    onCerrar: () => void;
}) {
    const [fechaInicio, setFechaInicio] = useState(t.fecha_inicio);
    const [fechaFin, setFechaFin] = useState(t.fecha_fin ?? '');

    const erroresFechas = validarRangoFechas(fechaInicio, fechaFin, {
        inicioInvalida: 'Elige una fecha de inicio válida.',
        finInvalida: 'Elige una fecha de término válida.',
    });
    const fechasInvalidas = Boolean(erroresFechas.inicio || erroresFechas.fin);
    const duracionDias = diasEntreFechas(fechaInicio, fechaFin);

    return (
        <>
            <DialogHeader>
                <DialogTitle>Editar tratamiento</DialogTitle>
                <DialogDescription>
                    Corrige los datos del ensayo. Los escaneos ya guardados no
                    cambian; al cerrarlo deja de admitir escaneos nuevos.
                </DialogDescription>
            </DialogHeader>

            <Form
                {...TratamientoController.update.form(t.id)}
                options={{ preserveScroll: true }}
                onSuccess={onCerrar}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="editar-nombre">
                                Nombre del tratamiento
                            </Label>
                            <Input
                                id="editar-nombre"
                                name="nombre"
                                defaultValue={t.nombre}
                                maxLength={255}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Identifica el ensayo o lote para distinguirlo en
                                el historial y al comparar.
                            </p>
                            <InputError message={errors.nombre} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="editar-fecha-inicio">
                                    Fecha de inicio
                                </Label>
                                <Input
                                    id="editar-fecha-inicio"
                                    name="fecha_inicio"
                                    type="date"
                                    value={fechaInicio}
                                    max={fechaFin || undefined}
                                    aria-invalid={
                                        Boolean(
                                            erroresFechas.inicio ||
                                            errors.fecha_inicio,
                                        ) || undefined
                                    }
                                    onChange={(e) =>
                                        setFechaInicio(e.target.value)
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Día en que inició la incubación.
                                </p>
                                <InputError
                                    message={
                                        erroresFechas.inicio ??
                                        errors.fecha_inicio
                                    }
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="editar-fecha-fin">
                                    Fecha de término
                                </Label>
                                <Input
                                    id="editar-fecha-fin"
                                    name="fecha_fin"
                                    type="date"
                                    min={fechaInicio || undefined}
                                    value={fechaFin}
                                    aria-invalid={
                                        Boolean(
                                            erroresFechas.fin ||
                                            errors.fecha_fin,
                                        ) || undefined
                                    }
                                    onChange={(e) =>
                                        setFechaFin(e.target.value)
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Día de cierre o evaluación (opcional).
                                </p>
                                <InputError
                                    message={
                                        erroresFechas.fin ?? errors.fecha_fin
                                    }
                                />
                            </div>

                            {duracionDias !== null && (
                                <p className="text-xs text-muted-foreground sm:col-span-2">
                                    Duración calculada: {duracionDias}{' '}
                                    {duracionDias === 1 ? 'día' : 'días'}.
                                </p>
                            )}
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="editar-temperatura">
                                    Temperatura
                                </Label>
                                <select
                                    id="editar-temperatura"
                                    name="temperatura"
                                    defaultValue={t.temperatura ?? ''}
                                    className={cn(clasesCampo, 'h-9')}
                                >
                                    <option value="">Sin especificar</option>
                                    {temperaturas.map((temperatura) => (
                                        <option
                                            key={temperatura}
                                            value={temperatura}
                                        >
                                            {temperatura}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Temperatura de incubación del ensayo.
                                </p>
                                <InputError message={errors.temperatura} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="editar-estado">Estado</Label>
                                <select
                                    id="editar-estado"
                                    name="estado"
                                    defaultValue={t.estado}
                                    required
                                    className={cn(clasesCampo, 'h-9')}
                                >
                                    <option value="abierto">
                                        Abierto (admite escaneos)
                                    </option>
                                    <option value="cerrado">
                                        Cerrado (ya no admite escaneos)
                                    </option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Controla si se pueden agregar más tallos.
                                </p>
                                <InputError message={errors.estado} />
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="editar-notas">Notas</Label>
                            <textarea
                                id="editar-notas"
                                name="notas"
                                rows={3}
                                maxLength={2000}
                                defaultValue={t.notas ?? ''}
                                placeholder="Observaciones del ensayo"
                                className={cn(clasesCampo, 'py-2')}
                            />
                            <InputError message={errors.notas} />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onCerrar}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing || fechasInvalidas}
                            >
                                {processing && <Spinner />}
                                Guardar cambios
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </Form>
        </>
    );
}

/**
 * Confirmación para descartar un escaneo que no sirve (foto mal tomada, tallo repetido).
 */
function DescartarEscaneo({
    escaneo,
    numero,
    onCerrar,
}: {
    escaneo: EscaneoVista | null;
    numero: number;
    onCerrar: () => void;
}) {
    const [procesando, setProcesando] = useState(false);

    const eliminar = () => {
        if (!escaneo) {
            return;
        }

        router.delete(destroyEscaneo(escaneo.id).url, {
            preserveScroll: true,
            onStart: () => setProcesando(true),
            onFinish: () => setProcesando(false),
            onSuccess: onCerrar,
        });
    };

    return (
        <Dialog
            open={escaneo !== null}
            onOpenChange={(abierto) => !abierto && onCerrar()}
        >
            {escaneo && (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            ¿Descartar el {nombreEscaneo(numero).toLowerCase()}?
                        </DialogTitle>
                        <DialogDescription>
                            Se borran el resultado (
                            {escaneo.porcentaje.toFixed(1)} % de daño) y las dos
                            imágenes
                            {escaneo.numero_cana
                                ? ` de «${escaneo.numero_cana}»`
                                : ''}
                            . El resto del tratamiento no cambia y esta acción
                            no se puede deshacer.
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
                            Descartar escaneo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
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
    onDescartar,
}: {
    escaneo: EscaneoVista;
    numero: number;
    ultimoNivel: number;
    onAbrir: () => void;
    /** Si se pasa, aparece el botón para descartar este escaneo */
    onDescartar?: () => void;
}) {
    return (
        <Card className="h-full gap-0 overflow-hidden py-0">
            {/* El botón de descartar va fuera del de abrir: no se pueden anidar */}
            <div className="relative">
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
                </button>

                {onDescartar && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 size-8 bg-background/90 text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive"
                        onClick={onDescartar}
                        aria-label={`Descartar ${nombreEscaneo(numero)}`}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                )}
            </div>

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
