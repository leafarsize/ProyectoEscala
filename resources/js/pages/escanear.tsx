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
import { NivelBadge } from '@/components/escaneo-detalle';
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
    /** null en los tratamientos creados después de quitarlos del formulario */
    variedad: string | null;
    lote: string | null;
    escaneos: number;
};

type DatosEscaneo = {
    imagen: File | null;
    tratamiento_id: string;
    nombre: string;
    temperatura: string;
    /** Inicio y fin de la incubación (AAAA-MM-DD), elegidos en el calendario */
    fecha_inicio: string;
    fecha_fin: string;
    /** Identifica el tallo de la foto dentro del tratamiento */
    numero_cana: string;
};

type Modo = 'nuevo' | 'existente';

/** Condiciones de incubación (config/escala.php) y sus valores por defecto */
type Condiciones = {
    temperaturas: string[];
    temperatura: string;
    /** Hoy */
    fecha_inicio: string;
    /** Hoy + dias_por_defecto, solo como propuesta */
    fecha_fin: string;
};

const FORMATOS = 'image/jpeg,image/png,image/webp';

export default function Escanear({
    maxKb,
    niveles,
    puedeGuardar,
    tratamientos,
    tratamientoInicial,
    condiciones,
}: {
    maxKb: number;
    niveles: Nivel[];
    puedeGuardar: boolean;
    tratamientos: TratamientoOpcion[];
    tratamientoInicial: number | null;
    condiciones: Condiciones;
}) {
    const http = useHttp<DatosEscaneo, Resultado>({
        imagen: null,
        tratamiento_id: tratamientoInicial ? String(tratamientoInicial) : '',
        nombre: '',
        temperatura: condiciones.temperatura,
        fecha_inicio: condiciones.fecha_inicio,
        fecha_fin: condiciones.fecha_fin,
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
            'temperatura',
            'fecha_inicio',
            'fecha_fin',
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
                temperatura: condiciones.temperatura,
                fecha_inicio: condiciones.fecha_inicio,
                fecha_fin: condiciones.fecha_fin,
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
                    as="h1"
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
                                condiciones={condiciones}
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
                                        onFoto={elegirFoto}
                                        onAbrirCamara={() =>
                                            setVisorCamaraAbierto(true)
                                        }
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
                        void elegirFoto(archivo);
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
    condiciones,
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
    condiciones: Condiciones;
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
                                placeholder="Ej. M. guilliermondii lote 3, o Testigo"
                                value={datos.nombre}
                                maxLength={255}
                                disabled={deshabilitado}
                                onChange={(e) =>
                                    onCambio('nombre', e.target.value)
                                }
                            />
                        </Campo>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo
                                id="fecha_inicio"
                                etiqueta="Fecha de inicio"
                                error={errores.fecha_inicio}
                            >
                                <Input
                                    id="fecha_inicio"
                                    type="date"
                                    value={datos.fecha_inicio}
                                    disabled={deshabilitado}
                                    onChange={(e) =>
                                        onCambio('fecha_inicio', e.target.value)
                                    }
                                />
                            </Campo>

                            <Campo
                                id="fecha_fin"
                                etiqueta="Fecha de término"
                                error={errores.fecha_fin}
                            >
                                <Input
                                    id="fecha_fin"
                                    type="date"
                                    min={datos.fecha_inicio || undefined}
                                    value={datos.fecha_fin}
                                    disabled={deshabilitado}
                                    onChange={(e) =>
                                        onCambio('fecha_fin', e.target.value)
                                    }
                                />
                            </Campo>
                        </div>

                        <Campo
                            id="temperatura"
                            etiqueta="Temperatura"
                            error={errores.temperatura}
                        >
                            <ListaOpciones
                                id="temperatura"
                                valor={datos.temperatura}
                                opciones={condiciones.temperaturas}
                                deshabilitado={deshabilitado}
                                onCambio={(valor) =>
                                    onCambio('temperatura', valor)
                                }
                            />
                        </Campo>
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
                                        {[t.nombre, t.variedad, t.lote]
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

/**
 * Lista desplegable con valores fijos (config/escala.php).
 */
function ListaOpciones({
    id,
    valor,
    opciones,
    deshabilitado,
    onCambio,
}: {
    id: string;
    valor: string;
    opciones: string[];
    deshabilitado: boolean;
    onCambio: (valor: string) => void;
}) {
    return (
        <Select
            value={valor || undefined}
            disabled={deshabilitado}
            onValueChange={onCambio}
        >
            <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder="Elige una opción" />
            </SelectTrigger>
            <SelectContent>
                {opciones.map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                        {opcion}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
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
            {/* Opciones de captura: Visor con marco guía o Cámara nativa.
                En PC no aparecen: ahí solo se sube un archivo (ver variante "movil"). */}
            <div className="hidden grid-cols-1 gap-2.5 sm:grid-cols-2 movil:grid">
                <Button
                    type="button"
                    size="lg"
                    onClick={onAbrirCamara}
                    className="h-16 w-full rounded-xl font-semibold"
                >
                    <Camera className="size-5" />
                    Abrir cámara con marco
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => inputNativaDirectoRef.current?.click()}
                    className="h-16 w-full rounded-xl"
                >
                    <Smartphone className="size-5" />
                    Cámara del celular
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
                <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground movil:bg-muted movil:text-foreground">
                    <ImageUp className="size-4" />
                    Subir imagen
                </span>
                <span className="text-xs text-muted-foreground">
                    <span className="movil:hidden">
                        Arrastra una imagen aquí ·{' '}
                    </span>
                    JPG, PNG o WEBP
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
                30 cm de distancia sobre fondo blanco liso.
            </p>
        </div>
    );
}

function VistaPrevia({
    src,
    analizando,
    onQuitar,
    onFoto,
    onAbrirCamara,
}: {
    src: string;
    analizando: boolean;
    onQuitar: () => void;
    onFoto: (archivo: File) => void;
    onAbrirCamara: () => void;
}) {
    const inputNativaRef = useRef<HTMLInputElement>(null);
    const inputGaleriaRef = useRef<HTMLInputElement>(null);

    const alSeleccionar = (e: ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo

        if (archivo) {
            onFoto(archivo);
        }
    };

    return (
        <div className="flex flex-col gap-3">
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
                        Quitar
                    </Button>
                )}
            </div>

            {/* Si la foto salió mal, se corrige aquí mismo sin perder el tratamiento */}
            <div className="flex flex-col gap-2 sm:flex-row">
                {/* Las dos opciones de cámara solo en teléfono o tableta.
                    "contents" deja que los botones sigan siendo hijos del flex. */}
                <div className="hidden movil:contents">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={analizando}
                        onClick={onAbrirCamara}
                        className="sm:flex-1"
                    >
                        <RotateCcw />
                        Volver a tomar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={analizando}
                        onClick={() => inputNativaRef.current?.click()}
                        className="sm:flex-1"
                    >
                        <Smartphone />
                        Cámara del celular
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    disabled={analizando}
                    onClick={() => inputGaleriaRef.current?.click()}
                    className="sm:flex-1"
                >
                    <ImageUp />
                    Elegir otra foto
                </Button>
            </div>

            <input
                ref={inputNativaRef}
                type="file"
                accept={FORMATOS}
                capture="environment"
                onChange={alSeleccionar}
                className="sr-only"
            />

            <input
                ref={inputGaleriaRef}
                type="file"
                accept={FORMATOS}
                onChange={alSeleccionar}
                className="sr-only"
            />
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
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <p className="text-base font-semibold">
                                {resultado.etiqueta}
                            </p>
                            <NivelBadge
                                nivel={resultado.nivel}
                                ultimoNivel={ultimoNivel}
                            />
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
