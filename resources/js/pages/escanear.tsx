import { Head, Link, router, useHttp } from '@inertiajs/react';
import {
    Camera,
    FlaskConical,
    ImageUp,
    Plus,
    RotateCcw,
    ScanLine,
    Smartphone,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VisorCamara } from '@/components/visor-camara';
import { reducirImagen } from '@/lib/reducir-imagen';
import { reproducirSonidoExito, reproducirSonidoFallo } from '@/lib/sonidos';
import { cn } from '@/lib/utils';
import { analizar, create } from '@/routes/escaneo';
import { show as verTratamiento } from '@/routes/laboratorio/tratamientos';

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
    /** null cuando el análisis no se guarda (productor) */
    tratamiento: { id: number; nombre: string; escaneos: number } | null;
};

type TratamientoOpcion = {
    id: number;
    nombre: string;
    medicamento: string | null;
    /** null en los tratamientos creados después de quitarlos del formulario */
    variedad: string | null;
    lote: string | null;
    escaneos: number;
};

type DatosEscaneo = {
    imagen: File | null;
    tratamiento_id: string;
    nombre: string;
    medicamento: string;
    duracion: string;
    temperatura: string;
    /** Identifica el tallo de la foto dentro del tratamiento */
    numero_cana: string;
};

type Modo = 'nuevo' | 'existente';

const FORMATOS = 'image/jpeg,image/png,image/webp';

export default function Escanear({
    maxKb,
    niveles,
    puedeGuardar,
    tratamientos,
    tratamientoInicial,
}: {
    maxKb: number;
    niveles: Nivel[];
    puedeGuardar: boolean;
    tratamientos: TratamientoOpcion[];
    tratamientoInicial: number | null;
}) {
    const http = useHttp<DatosEscaneo, Resultado>({
        imagen: null,
        tratamiento_id: tratamientoInicial ? String(tratamientoInicial) : '',
        nombre: '',
        medicamento: '',
        duracion: '',
        temperatura: '',
        numero_cana: '',
    });
    const [modo, setModo] = useState<Modo>(
        tratamientoInicial ? 'existente' : 'nuevo',
    );
    const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [errorServidor, setErrorServidor] = useState<string | null>(null);
    const [visorCamaraAbierto, setVisorCamaraAbierto] = useState(false);

    // Escuchar aperturas solicitadas desde el menú móvil o parámetro de URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('abrir_camara') === '1') {
                const url = new URL(window.location.href);
                url.searchParams.delete('abrir_camara');
                window.history.replaceState({}, '', url.toString());
                setVisorCamaraAbierto(true);
            }

            const alAbrirCamara = () => setVisorCamaraAbierto(true);
            window.addEventListener('abrir-camara-visor', alAbrirCamara);

            return () => {
                window.removeEventListener('abrir-camara-visor', alAbrirCamara);
            };
        }
    }, []);

    const cambiarModo = (nuevo: Modo) => {
        setModo(nuevo);
        http.clearErrors(
            'tratamiento_id',
            'nombre',
            'medicamento',
            'duracion',
            'temperatura',
        );
        // En un tratamiento nuevo no se envía tratamiento_id
        if (nuevo === 'nuevo') {
            http.setData('tratamiento_id', '');
        }
    };

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
            const mensaje =
                'Formato no válido. Usa una imagen JPG, PNG o WEBP.';
            http.setError('imagen', mensaje);
            toast.error(mensaje);
            reproducirSonidoFallo();

            return;
        }

        try {
            const archivo = await reducirImagen(original);

            if (archivo.size > maxKb * 1024) {
                const mensaje = 'La imagen supera el tamaño máximo de 10 MB.';
                http.setError('imagen', mensaje);
                toast.error(mensaje);
                reproducirSonidoFallo();

                return;
            }

            http.setData('imagen', archivo);
            setVistaPrevia(URL.createObjectURL(archivo));
            toast.success('Imagen cargada con éxito');
            reproducirSonidoExito();
        } catch {
            const mensaje = 'No se pudo cargar la imagen seleccionada.';
            http.setError('imagen', mensaje);
            toast.error(mensaje);
            reproducirSonidoFallo();
        }
    };

    const quitarFoto = () => {
        setResultado(null);
        setVistaPrevia(null);
        setErrorServidor(null);
        http.setData('imagen', null);
        http.clearErrors('imagen');
    };

    /** Después de un resultado: otro escaneo del mismo tratamiento o empezar de cero. */
    const nuevoEscaneo = (mismoTratamiento: boolean) => {
        const tratamiento = resultado?.tratamiento;

        setResultado(null);
        setVistaPrevia(null);
        setErrorServidor(null);
        http.clearErrors();

        if (mismoTratamiento && tratamiento) {
            http.setData({
                ...http.data,
                imagen: null,
                tratamiento_id: String(tratamiento.id),
                // El siguiente escaneo es otro tallo
                numero_cana: '',
            });
            setModo('existente');
        } else {
            http.setData({
                imagen: null,
                tratamiento_id: '',
                nombre: '',
                medicamento: '',
                duracion: '',
                temperatura: '',
                numero_cana: '',
            });
            setModo('nuevo');
        }
    };

    const analizarTallo = async () => {
        setErrorServidor(null);

        if (puedeGuardar && modo === 'existente' && !http.data.tratamiento_id) {
            http.setError('tratamiento_id', 'Elige un tratamiento.');

            return;
        }

        try {
            // Los errores de validación (422) quedan en http.errors
            const respuesta = await http.submit(analizar());

            if (respuesta) {
                setResultado(respuesta);

                if (respuesta.tratamiento) {
                    // El tratamiento nuevo (o su conteo) aparece en la lista para el siguiente escaneo
                    router.reload({ only: ['tratamientos'] });
                }
            }
        } catch (error) {
            reproducirSonidoFallo();
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

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-6 md:py-8">
                <Heading
                    title="Escanear tallo"
                    description="Obtén el porcentaje de daño y el nivel de severidad de un tallo de caña."
                />

                {resultado && vistaPrevia ? (
                    <VistaResultado
                        resultado={resultado}
                        original={vistaPrevia}
                        niveles={niveles}
                        onNuevo={nuevoEscaneo}
                    />
                ) : (
                    <>
                        {puedeGuardar && (
                            <SeccionTratamiento
                                modo={modo}
                                onModo={cambiarModo}
                                datos={http.data}
                                onCambio={(campo, valor) => {
                                    http.setData(campo, valor);
                                    http.clearErrors(campo);
                                }}
                                errores={http.errors}
                                tratamientos={tratamientos}
                                deshabilitado={http.processing}
                            />
                        )}
                        <Card>
                            <CardContent className="flex flex-col gap-4">
                                {vistaPrevia ? (
                                    <VistaPrevia
                                        src={vistaPrevia}
                                        analizando={http.processing}
                                        onQuitar={quitarFoto}
                                    />
                                ) : (
                                    <ZonaFoto
                                        onFoto={elegirFoto}
                                        onAbrirCamara={() =>
                                            setVisorCamaraAbierto(true)
                                        }
                                    />
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
                    </>
                )}
            </div>

            {visorCamaraAbierto && (
                <VisorCamara
                    onFoto={(archivo) => {
                        setVisorCamaraAbierto(false);
                        elegirFoto(archivo);
                    }}
                    onCerrar={() => setVisorCamaraAbierto(false)}
                />
            )}
        </>
    );
}

function SeccionTratamiento({
    modo,
    onModo,
    datos,
    onCambio,
    errores,
    tratamientos,
    deshabilitado,
}: {
    modo: Modo;
    onModo: (modo: Modo) => void;
    datos: DatosEscaneo;
    onCambio: (
        campo: Exclude<keyof DatosEscaneo, 'imagen'>,
        valor: string,
    ) => void;
    errores: Partial<Record<keyof DatosEscaneo, string>>;
    tratamientos: TratamientoOpcion[];
    deshabilitado: boolean;
}) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FlaskConical className="size-4 text-muted-foreground" />
                        <p className="font-medium">Tratamiento</p>
                    </div>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={modo}
                        disabled={deshabilitado}
                        onValueChange={(valor) =>
                            valor && onModo(valor as Modo)
                        }
                    >
                        <ToggleGroupItem value="nuevo" className="px-3">
                            Nuevo
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="existente"
                            className="px-3"
                            disabled={tratamientos.length === 0}
                        >
                            Existente
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {modo === 'nuevo' ? (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Este escaneo inicia un tratamiento nuevo.
                        </p>
                        <Campo
                            id="nombre"
                            etiqueta="Nombre del tratamiento"
                            error={errores.nombre}
                        >
                            <Input
                                id="nombre"
                                value={datos.nombre}
                                maxLength={255}
                                disabled={deshabilitado}
                                onChange={(e) =>
                                    onCambio('nombre', e.target.value)
                                }
                            />
                        </Campo>

                        <Campo
                            id="medicamento"
                            etiqueta="Medicamento / Producto"
                            error={errores.medicamento}
                        >
                            <Input
                                id="medicamento"
                                placeholder="Ej. Mancozeb, Trichoderma..."
                                value={datos.medicamento}
                                maxLength={150}
                                disabled={deshabilitado}
                                onChange={(e) =>
                                    onCambio('medicamento', e.target.value)
                                }
                            />
                        </Campo>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo
                                id="duracion"
                                etiqueta="Duración"
                                error={errores.duracion}
                            >
                                <Input
                                    id="duracion"
                                    placeholder="Ej. 15 días"
                                    value={datos.duracion}
                                    maxLength={50}
                                    disabled={deshabilitado}
                                    onChange={(e) =>
                                        onCambio('duracion', e.target.value)
                                    }
                                />
                            </Campo>

                            <Campo
                                id="temperatura"
                                etiqueta="Temperatura"
                                error={errores.temperatura}
                            >
                                <Input
                                    id="temperatura"
                                    placeholder="Ej. 25 °C"
                                    value={datos.temperatura}
                                    maxLength={50}
                                    disabled={deshabilitado}
                                    onChange={(e) =>
                                        onCambio('temperatura', e.target.value)
                                    }
                                />
                            </Campo>
                        </div>
                    </>
                ) : (
                    <Campo
                        id="tratamiento"
                        etiqueta="Agregar el escaneo al tratamiento"
                        error={errores.tratamiento_id}
                    >
                        <Select
                            value={datos.tratamiento_id || undefined}
                            disabled={deshabilitado}
                            onValueChange={(valor) =>
                                onCambio('tratamiento_id', valor)
                            }
                        >
                            <SelectTrigger id="tratamiento" className="w-full">
                                <SelectValue placeholder="Elige un tratamiento abierto" />
                            </SelectTrigger>
                            <SelectContent>
                                {tratamientos.map((t) => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                        {[
                                            t.nombre,
                                            t.medicamento,
                                            t.variedad,
                                            t.lote,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}{' '}
                                        ({t.escaneos}{' '}
                                        {t.escaneos === 1
                                            ? 'escaneo'
                                            : 'escaneos'}
                                        )
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Campo>
                )}

                {/* Cada foto es un tallo distinto, así que se pide en los dos modos */}
                <Campo
                    id="numero_cana"
                    etiqueta="Número de caña"
                    error={errores.numero_cana}
                >
                    <Input
                        id="numero_cana"
                        value={datos.numero_cana}
                        maxLength={50}
                        disabled={deshabilitado}
                        onChange={(e) =>
                            onCambio('numero_cana', e.target.value)
                        }
                    />
                </Campo>
            </CardContent>
        </Card>
    );
}

function Campo({
    id,
    etiqueta,
    error,
    className,
    children,
}: {
    id: string;
    etiqueta: string;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={id}>{etiqueta}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function ZonaFoto({
    onFoto,
    onAbrirCamara,
}: {
    onFoto: (archivo: File) => void;
    onAbrirCamara: () => void;
}) {
    const [arrastrando, setArrastrando] = useState(false);
    const inputNativaDirectoRef = useRef<HTMLInputElement>(null);

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
        <div className="flex flex-col gap-4">
            {/* Opciones de captura: Visor con marco guía o Cámara nativa */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Button
                    type="button"
                    size="lg"
                    onClick={onAbrirCamara}
                    className="group h-16 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                    <Camera className="mr-2 size-5 transition-transform group-hover:scale-110" />
                    <span>Visor con marco (10 × 15)</span>
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => inputNativaDirectoRef.current?.click()}
                    className="h-16 w-full rounded-2xl border-2 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
                >
                    <Smartphone className="mr-2 size-5 text-primary" />
                    <span>Cámara nativa del celular</span>
                </Button>
            </div>

            {/* Input para cámara nativa del sistema */}
            <input
                ref={inputNativaDirectoRef}
                type="file"
                accept={FORMATOS}
                capture="environment"
                onChange={alSeleccionar}
                className="sr-only"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
                <span className="h-px flex-1 bg-border" />
                <span>o seleccionar desde galería</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            {/* Zona para elegir archivo o arrastrar */}
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltar}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                    'focus-within:ring-[3px] focus-within:ring-ring/50 hover:bg-muted/50',
                    arrastrando
                        ? 'border-foreground bg-muted/50'
                        : 'border-muted-foreground/25',
                )}
            >
                <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <ImageUp className="size-5 text-muted-foreground" />
                </span>
                <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                        Seleccionar foto existente
                    </span>
                    <span className="text-xs text-muted-foreground">
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

            <p className="text-center text-xs text-muted-foreground">
                Recomendación: corte longitudinal de entrenudo de 10 × 15 cm a
                ~30 cm de distancia sobre fondo blanco liso.
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
    onNuevo: (mismoTratamiento: boolean) => void;
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

                {resultado.tratamiento ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-center text-sm text-muted-foreground">
                            Guardado como{' '}
                            <span className="font-medium text-foreground">
                                {resultado.tratamiento.escaneos === 1
                                    ? 'escaneo inicial'
                                    : `escaneo ${resultado.tratamiento.escaneos}`}
                            </span>{' '}
                            del tratamiento{' '}
                            <Link
                                href={verTratamiento(resultado.tratamiento.id)}
                                className="font-medium text-foreground underline underline-offset-4"
                            >
                                {resultado.tratamiento.nombre}
                            </Link>
                            .
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <Button size="lg" onClick={() => onNuevo(true)}>
                                <Plus />
                                Otro escaneo de este tratamiento
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => onNuevo(false)}
                            >
                                <RotateCcw />
                                Nuevo tratamiento
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-center text-xs text-muted-foreground">
                            Análisis rápido: este resultado no se guarda.
                        </p>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => onNuevo(false)}
                            className="sm:self-center"
                        >
                            <RotateCcw />
                            Escanear otro tallo
                        </Button>
                    </>
                )}
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
