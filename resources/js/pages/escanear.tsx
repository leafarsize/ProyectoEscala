import { Head, useHttp } from '@inertiajs/react';
import { Camera, ImageUp, RotateCcw, ScanLine, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { reducirImagen } from '@/lib/reducir-imagen';
import { cn } from '@/lib/utils';
import { analizar, create } from '@/routes/escaneo';

type Nivel = {
    nivel: number;
    etiqueta: string;
    hasta: number | null;
};

type Resultado = {
    porcentaje: number;
    nivel: number;
    etiqueta: string;
    area_tallo_px: number;
    area_lesion_px: number;
    imagen_resaltada: string;
};

const FORMATOS = 'image/jpeg,image/png,image/webp';

export default function Escanear({
    maxKb,
    niveles,
}: {
    maxKb: number;
    niveles: Nivel[];
}) {
    const http = useHttp<{ imagen: File | null }, Resultado>({ imagen: null });
    const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [errorServidor, setErrorServidor] = useState<string | null>(null);

    // Liberar la URL temporal de la vista previa al cambiar de foto
    useEffect(() => {
        return () => {
            if (vistaPrevia) {
                URL.revokeObjectURL(vistaPrevia);
            }
        };
    }, [vistaPrevia]);

    const elegirFoto = async (original: File) => {
        setResultado(null);
        setErrorServidor(null);
        http.clearErrors();

        if (!original.type.startsWith('image/')) {
            http.setError(
                'imagen',
                'Formato no válido. Usa una imagen JPG, PNG o WEBP.',
            );

            return;
        }

        const archivo = await reducirImagen(original);

        if (archivo.size > maxKb * 1024) {
            http.setError(
                'imagen',
                'La imagen supera el tamaño máximo de 10 MB.',
            );

            return;
        }

        http.setData('imagen', archivo);
        setVistaPrevia(URL.createObjectURL(archivo));
    };

    const quitarFoto = () => {
        setResultado(null);
        setVistaPrevia(null);
        setErrorServidor(null);
        http.reset();
        http.clearErrors();
    };

    const analizarTallo = async () => {
        setErrorServidor(null);

        try {
            // Los errores de validación (422) quedan en http.errors.imagen
            const respuesta = await http.submit(analizar());

            if (respuesta) {
                setResultado(respuesta);
            }
        } catch (error) {
            // Se conserva la foto para poder reintentar
            const estado = (error as { response?: { status: number } }).response
                ?.status;
            // SyntaxError = el servidor respondió algo que no es JSON (p. ej. un warning de PHP)
            const sinConexion = !estado && !(error instanceof SyntaxError);

            setErrorServidor(
                estado === 429
                    ? 'Demasiados análisis seguidos. Espera un minuto e intenta de nuevo.'
                    : sinConexion
                      ? 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
                      : 'No se pudo analizar la imagen. Intenta de nuevo.',
            );
        }
    };

    return (
        <>
            <Head title="Escanear tallo" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
                <Heading
                    title="Escanear tallo"
                    description="Obtén el porcentaje de daño y el nivel de severidad de un tallo de caña."
                />

                {resultado && vistaPrevia ? (
                    <VistaResultado
                        resultado={resultado}
                        original={vistaPrevia}
                        niveles={niveles}
                        onNuevo={quitarFoto}
                    />
                ) : (
                    <Card>
                        <CardContent className="flex flex-col gap-4">
                            {vistaPrevia ? (
                                <VistaPrevia
                                    src={vistaPrevia}
                                    analizando={http.processing}
                                    onQuitar={quitarFoto}
                                />
                            ) : (
                                <ZonaFoto onFoto={elegirFoto} />
                            )}

                            <InputError message={http.errors.imagen} />

                            {errorServidor && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {errorServidor}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {vistaPrevia && (
                                <Button
                                    size="lg"
                                    disabled={http.processing}
                                    onClick={analizarTallo}
                                >
                                    {http.processing ? (
                                        <Spinner />
                                    ) : (
                                        <ScanLine />
                                    )}
                                    {http.processing
                                        ? 'Analizando…'
                                        : errorServidor
                                          ? 'Reintentar'
                                          : 'Analizar tallo'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

function ZonaFoto({ onFoto }: { onFoto: (archivo: File) => void }) {
    const [arrastrando, setArrastrando] = useState(false);

    const alSeleccionar = (e: ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo

        if (archivo) {
            onFoto(archivo);
        }
    };

    const alSoltar = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setArrastrando(false);

        const archivo = e.dataTransfer.files[0];

        if (archivo) {
            onFoto(archivo);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltar}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors',
                    'focus-within:ring-[3px] focus-within:ring-ring/50 hover:bg-muted/50',
                    arrastrando
                        ? 'border-foreground bg-muted/50'
                        : 'border-muted-foreground/25',
                )}
            >
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <ImageUp className="size-5 text-muted-foreground" />
                </span>
                <span className="flex flex-col gap-1">
                    <span className="font-medium">
                        Arrastra la foto aquí o haz clic para elegirla
                    </span>
                    <span className="text-sm text-muted-foreground">
                        JPG, PNG o WEBP
                    </span>
                </span>
                <input
                    type="file"
                    accept={FORMATOS}
                    onChange={alSeleccionar}
                    className="sr-only"
                />
            </label>

            <Button variant="outline" size="lg" asChild>
                <label className="cursor-pointer focus-within:ring-[3px] focus-within:ring-ring/50">
                    <Camera />
                    Tomar foto
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={alSeleccionar}
                        className="sr-only"
                    />
                </label>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
                Para mejores resultados: fondo blanco liso, a unos 30 cm, con
                buena luz y sin sombras.
            </p>
        </div>
    );
}

function VistaPrevia({
    src,
    analizando,
    onQuitar,
}: {
    src: string;
    analizando: boolean;
    onQuitar: () => void;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl bg-muted">
            <img
                src={src}
                alt="Vista previa del tallo"
                className={cn(
                    'mx-auto max-h-[26rem] w-full object-contain transition-opacity',
                    analizando && 'opacity-40',
                )}
            />

            {analizando ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium">
                    <Spinner className="size-6" />
                    Analizando tallo…
                </div>
            ) : (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onQuitar}
                    className="absolute top-3 right-3 shadow-sm"
                >
                    <X />
                    Cambiar
                </Button>
            )}
        </div>
    );
}

function VistaResultado({
    resultado,
    original,
    niveles,
    onNuevo,
}: {
    resultado: Resultado;
    original: string;
    niveles: Nivel[];
    onNuevo: () => void;
}) {
    const [vista, setVista] = useState<'lesiones' | 'original'>('lesiones');
    const ultimoNivel = niveles[niveles.length - 1]?.nivel ?? 5;

    return (
        <Card>
            <CardContent className="flex flex-col gap-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                    <Medidor porcentaje={resultado.porcentaje} />

                    <div className="flex w-full flex-col gap-4 text-center sm:text-left">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground">
                                Nivel {resultado.nivel} de {ultimoNivel}
                            </p>
                            <p className="text-2xl font-semibold tracking-tight">
                                {resultado.etiqueta}
                            </p>
                        </div>

                        <EscalaSeveridad
                            niveles={niveles}
                            actual={resultado.nivel}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                            {vista === 'lesiones'
                                ? 'Lesiones detectadas en rojo'
                                : 'Foto original'}
                        </p>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            value={vista}
                            onValueChange={(valor) =>
                                valor && setVista(valor as typeof vista)
                            }
                        >
                            <ToggleGroupItem value="lesiones" className="px-3">
                                Lesiones
                            </ToggleGroupItem>
                            <ToggleGroupItem value="original" className="px-3">
                                Original
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-muted">
                        <img
                            src={
                                vista === 'lesiones'
                                    ? resultado.imagen_resaltada
                                    : original
                            }
                            alt={
                                vista === 'lesiones'
                                    ? 'Tallo con las lesiones resaltadas en rojo'
                                    : 'Foto original del tallo'
                            }
                            className="mx-auto max-h-[32rem] w-full object-contain"
                        />
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="lg"
                    onClick={onNuevo}
                    className="sm:self-center"
                >
                    <RotateCcw />
                    Escanear otro tallo
                </Button>
            </CardContent>
        </Card>
    );
}

function Medidor({ porcentaje }: { porcentaje: number }) {
    const radio = 52;
    const circunferencia = 2 * Math.PI * radio;
    const relleno = Math.min(porcentaje, 100) / 100;

    return (
        <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle
                    cx="60"
                    cy="60"
                    r={radio}
                    fill="none"
                    strokeWidth="10"
                    className="stroke-muted"
                />
                <circle
                    cx="60"
                    cy="60"
                    r={radio}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circunferencia}
                    strokeDashoffset={circunferencia * (1 - relleno)}
                    className="stroke-foreground transition-[stroke-dashoffset] duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">
                    {porcentaje.toFixed(1)}
                    <span className="text-lg text-muted-foreground">%</span>
                </span>
                <span className="text-xs text-muted-foreground">de daño</span>
            </div>
        </div>
    );
}

function EscalaSeveridad({
    niveles,
    actual,
}: {
    niveles: Nivel[];
    actual: number;
}) {
    return (
        <div className="flex flex-col gap-2">
            <ol className="flex gap-1">
                {niveles.map((n, i) => {
                    const desde = niveles[i - 1]?.hasta ?? 0;
                    const rango =
                        n.hasta === null
                            ? `≥ ${desde} %`
                            : `${desde}–${n.hasta} %`;

                    return (
                        <li
                            key={n.nivel}
                            title={`Nivel ${n.nivel}: ${n.etiqueta} (${rango})`}
                            aria-current={
                                n.nivel === actual ? 'true' : undefined
                            }
                            className="flex flex-1 flex-col gap-1.5"
                        >
                            <span
                                className={cn(
                                    'h-2 rounded-full',
                                    n.nivel <= actual
                                        ? 'bg-foreground'
                                        : 'bg-muted',
                                )}
                            />
                            <span
                                className={cn(
                                    'text-center text-xs tabular-nums',
                                    n.nivel === actual
                                        ? 'font-semibold'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {n.nivel}
                            </span>
                        </li>
                    );
                })}
            </ol>
            <p className="text-xs text-muted-foreground">
                {niveles
                    .filter((_, i) => i === 0 || i === niveles.length - 1)
                    .map((n) => `${n.nivel} = ${n.etiqueta}`)
                    .join('  ')}{' '}
                rangos provisionales
            </p>
        </div>
    );
}

Escanear.layout = {
    breadcrumbs: [
        {
            title: 'Escanear tallo',
            href: create(),
        },
    ],
};
