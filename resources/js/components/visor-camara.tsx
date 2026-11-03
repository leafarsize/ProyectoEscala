import {
    Camera,
    FlipHorizontal,
    ImageUp,
    Info,
    RotateCcw,
    Smartphone,
    SwitchCamera,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    onFoto: (archivo: File) => void;
    onCerrar: () => void;
};

type ModoDistancia = '30cm' | '20cm';

export function VisorCamara({ onFoto, onCerrar }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const inputGaleriaRef = useRef<HTMLInputElement>(null);
    const inputNativaRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef<boolean>(true);

    const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
        'environment',
    );
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
    const [distancia, setDistancia] = useState<ModoDistancia>('30cm');

    const detenerCamara = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    // Ignorar errores al detener tracks
                }
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const iniciarCamara = async (modo: 'environment' | 'user') => {
        detenerCamara();
        setCargando(true);
        setError(null);
        setErrorDetalle(null);

        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices?.getUserMedia
        ) {
            setError(
                'Tu navegador actual no soporta transmisión directa de cámara en este contexto.',
            );
            setErrorDetalle(
                'Puedes usar directamente la cámara nativa de tu teléfono o subir una foto desde tus archivos.',
            );
            setCargando(false);
            return;
        }

        // Probar progresivamente configuraciones de menor a mayor compatibilidad
        const intentos: MediaStreamConstraints[] = [
            // 1. Cámara trasera/frontal con resolución moderada adecuada para móviles
            {
                video: {
                    facingMode: { ideal: modo },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            },
            // 2. Solo facingMode ideal sin restricciones de resolución
            {
                video: {
                    facingMode: { ideal: modo },
                },
                audio: false,
            },
            // 3. FacingMode exacto si es posible
            {
                video: {
                    facingMode: modo,
                },
                audio: false,
            },
            // 4. Cualquier cámara disponible (fallback definitivo)
            {
                video: true,
                audio: false,
            },
        ];

        let streamObtenido: MediaStream | null = null;
        let ultimoError: unknown = null;

        for (const config of intentos) {
            try {
                streamObtenido =
                    await navigator.mediaDevices.getUserMedia(config);
                if (streamObtenido) break;
            } catch (err: unknown) {
                ultimoError = err;
                // Intentar la siguiente configuración de fallback
            }
        }

        if (!isMountedRef.current) {
            if (streamObtenido) {
                streamObtenido.getTracks().forEach((t) => t.stop());
            }
            return;
        }

        if (!streamObtenido) {
            const errObj = ultimoError as { name?: string; message?: string } | null;
            const errName = errObj?.name || 'Error';
            const errMsg = errObj?.message || 'No fue posible abrir el sensor de cámara';

            console.error('Error al solicitar cámara:', ultimoError);

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                setError('Permiso de cámara denegado');
                setErrorDetalle(
                    'El navegador no tiene permiso para usar la cámara o fue cancelado. Puedes habilitarlo en los ajustes del sitio o usar la cámara nativa.',
                );
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                setError('La cámara está ocupada');
                setErrorDetalle(
                    'Otra aplicación (o pestaña) está utilizando la cámara de tu teléfono. Ciérrala y vuelve a intentar, o usa la cámara nativa.',
                );
            } else if (errName === 'OverconstrainedError') {
                setError('Resolución de cámara no compatible');
                setErrorDetalle(
                    'El sensor de tu teléfono no aceptó la configuración solicitada.',
                );
            } else {
                setError(`No se pudo conectar a la cámara (${errName})`);
                setErrorDetalle(errMsg);
            }

            setCargando(false);
            return;
        }

        streamRef.current = streamObtenido;

        // Configurar el elemento de video de manera segura para navegadores móviles (iOS Safari / Android Chrome)
        const video = videoRef.current;
        if (video) {
            video.srcObject = streamObtenido;
            video.muted = true;
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');

            // En móviles, play() puede tardar o fallar si se llama antes de que existan metadatos
            const reproducir = () => {
                video
                    .play()
                    .catch((e) => {
                        console.warn(
                            'Reproducción diferida de video:',
                            e?.message || e,
                        );
                    })
                    .finally(() => {
                        if (isMountedRef.current) {
                            setCargando(false);
                        }
                    });
            };

            if (video.readyState >= 2) {
                reproducir();
            } else {
                video.onloadedmetadata = () => {
                    reproducir();
                };
            }
        } else {
            setCargando(false);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        iniciarCamara(facingMode);

        return () => {
            isMountedRef.current = false;
            detenerCamara();
        };
    }, [facingMode]);

    const cambiarCamara = () => {
        setFacingMode((prev) =>
            prev === 'environment' ? 'user' : 'environment',
        );
    };

    const capturarFoto = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const archivo = new File([blob], `tallo_${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                });
                detenerCamara();
                onFoto(archivo);
            },
            'image/jpeg',
            0.95,
        );
    };

    const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (archivo) {
            detenerCamara();
            onFoto(archivo);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
            {/* Barra superior de controles */}
            <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/50 to-transparent p-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        detenerCamara();
                        onCerrar();
                    }}
                    className="size-11 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md"
                    aria-label="Cerrar cámara"
                >
                    <X className="size-6" />
                </Button>

                {/* Selector de distancia de toma */}
                <div className="flex items-center rounded-full bg-black/60 p-1 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setDistancia('30cm')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            distancia === '30cm'
                                ? 'bg-primary text-white shadow'
                                : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        📏 ~30 cm (Normal)
                    </button>
                    <button
                        type="button"
                        onClick={() => setDistancia('20cm')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            distancia === '20cm'
                                ? 'bg-primary text-white shadow'
                                : 'text-neutral-300 hover:text-white'
                        }`}
                    >
                        🔍 ~20 cm (Cerca)
                    </button>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cambiarCamara}
                    className="size-11 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md"
                    aria-label="Cambiar cámara"
                >
                    <SwitchCamera className="size-6" />
                </Button>
            </div>

            {/* Contenedor del video con el marco guía de 10 cm de ancho por 15 cm de alto */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                />

                {cargando && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
                        <Spinner className="size-9 text-primary" />
                        <p className="text-sm font-medium text-neutral-200">
                            Iniciando cámara…
                        </p>
                    </div>
                )}

                {error ? (
                    <div className="relative z-20 mx-4 max-w-sm rounded-2xl bg-card p-6 text-center text-foreground shadow-2xl border border-border">
                        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <Info className="size-6" />
                        </div>
                        <h3 className="text-base font-bold">{error}</h3>
                        {errorDetalle && (
                            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                                {errorDetalle}
                            </p>
                        )}

                        <div className="mt-5 flex flex-col gap-2.5">
                            {/* Opción 1: Cámara oficial/nativa del teléfono */}
                            <Button
                                size="lg"
                                className="w-full bg-primary font-bold text-primary-foreground shadow-md shadow-primary/25"
                                onClick={() => inputNativaRef.current?.click()}
                            >
                                <Smartphone className="mr-2 size-5" />
                                Abrir cámara de mi celular
                            </Button>

                            {/* Opción 2: Galería */}
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={() => inputGaleriaRef.current?.click()}
                            >
                                <ImageUp className="mr-2 size-4" />
                                Elegir desde galería
                            </Button>

                            {/* Opción 3: Reintentar visor en vivo */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => iniciarCamara(facingMode)}
                            >
                                <RotateCcw className="mr-1.5 size-3.5" />
                                Reintentar visor en vivo
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Marco guía proporcional 10 de ancho × 15 de alto (aspecto 10/15 o 2/3) */
                    <div className="relative z-10 flex items-center justify-center pointer-events-none">
                        <div
                            className="relative flex flex-col items-center justify-between rounded-2xl border-2 border-primary/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300"
                            style={{
                                width:
                                    distancia === '30cm'
                                        ? 'min(58vw, 220px)'
                                        : 'min(76vw, 285px)',
                                height:
                                    distancia === '30cm'
                                        ? 'min(87vw, 330px)'
                                        : 'min(114vw, 428px)',
                                aspectRatio: '10 / 15',
                            }}
                        >
                            {/* Esquinas reforzadas estilo escáner profesional */}
                            <span className="absolute -top-0.5 -left-0.5 size-7 rounded-tl-xl border-t-4 border-l-4 border-primary" />
                            <span className="absolute -top-0.5 -right-0.5 size-7 rounded-tr-xl border-t-4 border-r-4 border-primary" />
                            <span className="absolute -bottom-0.5 -left-0.5 size-7 rounded-bl-xl border-b-4 border-l-4 border-primary" />
                            <span className="absolute -bottom-0.5 -right-0.5 size-7 rounded-br-xl border-b-4 border-r-4 border-primary" />

                            {/* Cotas dimensionales (10 cm ancho × 15 cm alto) */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-mono text-primary font-bold">
                                ↔ 10 cm
                            </div>
                            <div className="absolute -left-7 top-1/2 -translate-y-1/2 -rotate-90 rounded bg-black/75 px-2 py-0.5 text-[10px] font-mono text-primary font-bold whitespace-nowrap">
                                ↕ 15 cm
                            </div>

                            {/* Línea guía vertical central con marca de entrenudo */}
                            <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-white/40" />

                            {/* Silueta translúcida del tallo para dar referencia visual inmediata */}
                            <div className="absolute inset-y-8 left-1/2 w-14 -translate-x-1/2 rounded-full border border-dashed border-primary/30 bg-primary/5" />

                            {/* Etiquetas informativas dentro del marco */}
                            <div className="mt-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md shadow">
                                Tallo de caña (10 × 15 cm)
                            </div>
                            <div className="mb-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-medium text-white/95 backdrop-blur-md shadow">
                                Distancia: {distancia === '30cm' ? '~30 cm' : '~20 cm'} sobre fondo claro
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Barra inferior con los disparadores de foto */}
            <div className="relative z-20 flex items-center justify-around bg-gradient-to-t from-black/95 via-black/80 to-transparent px-6 pt-3 pb-8">
                {/* Opción 1: Abrir cámara nativa del sistema */}
                <button
                    type="button"
                    onClick={() => inputNativaRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-xs text-white/80 hover:text-white transition-opacity active:opacity-70"
                    title="Usar app de cámara de tu celular"
                >
                    <span className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                        <Smartphone className="size-5" />
                    </span>
                    <span className="text-[11px] font-medium">Cámara celular</span>
                </button>

                {/* Opción 2: Disparador central del visor en vivo */}
                <button
                    type="button"
                    disabled={cargando || !!error}
                    onClick={capturarFoto}
                    aria-label="Tomar foto con encuadre"
                    className="group relative flex size-20 items-center justify-center rounded-full border-4 border-white p-1 transition-transform active:scale-95 disabled:opacity-40"
                >
                    <span className="flex size-full items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-colors group-hover:bg-primary/90">
                        <Camera className="size-8" />
                    </span>
                </button>

                {/* Opción 3: Galería */}
                <button
                    type="button"
                    onClick={() => inputGaleriaRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-xs text-white/80 hover:text-white transition-opacity active:opacity-70"
                >
                    <span className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                        <ImageUp className="size-5" />
                    </span>
                    <span className="text-[11px] font-medium">Galería</span>
                </button>
            </div>

            {/* Input oculto para cámara nativa del celular (capture="environment") */}
            <input
                ref={inputNativaRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleArchivo}
                className="sr-only"
            />

            {/* Input oculto para elegir foto de galería/archivos */}
            <input
                ref={inputGaleriaRef}
                type="file"
                accept="image/*"
                onChange={handleArchivo}
                className="sr-only"
            />
        </div>
    );
}
