import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { NivelBadge } from '@/components/escaneo-detalle';
import type { NivelSeveridad } from '@/components/escaneo-detalle';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type RevisionMascara = {
    imagen_base: string;
    mapa_revision: string;
    area_tallo_px: number;
    area_lesion_px: number;
};

type Punto = { x: number; y: number };

type Capas = {
    base: ImageData;
    visible: ImageData;
    mapa: ImageData;
    automatico: Uint8ClampedArray;
    afectados: number;
};

function mostrarPixel(capas: Capas, i: number) {
    const lesion = capas.mapa.data[i] === 255;
    const foto = capas.base.data;
    const vista = capas.visible.data;
    vista[i] = lesion ? (foto[i] + 255) / 2 : foto[i];
    vista[i + 1] = lesion ? foto[i + 1] / 2 : foto[i + 1];
    vista[i + 2] = lesion ? foto[i + 2] / 2 : foto[i + 2];
}

export function EditorMascara({
    revision,
    niveles,
    ocupado,
    puedeGuardar,
    onConfirmar,
    onVolver,
}: {
    revision: RevisionMascara;
    niveles: NivelSeveridad[];
    ocupado: boolean;
    puedeGuardar: boolean;
    onConfirmar: (archivo: File) => Promise<void>;
    onVolver: () => void;
}) {
    const lienzo = useRef<HTMLCanvasElement>(null);
    const capas = useRef<Capas | null>(null);
    const trazo = useRef<{ id: number; punto: Punto } | null>(null);
    const [modo, setModo] = useState('borrar');
    /** Con «original» se ve la foto tal cual, sin el rojo del daño encima */
    const [vista, setVista] = useState<'lesiones' | 'original'>('lesiones');
    const [diametro, setDiametro] = useState(24);
    const [afectados, setAfectados] = useState(revision.area_lesion_px);
    const [listo, setListo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const bloqueado = ocupado || enviando;
    const porcentaje = ((100 * afectados) / revision.area_tallo_px).toFixed(2);
    const severidad = niveles.find(
        ({ hasta }) => hasta === null || Number(porcentaje) < hasta,
    );
    const ultimoNivel = niveles.at(-1)?.nivel ?? 5;

    useEffect(() => {
        let activo = true;
        const foto = new Image();
        const mascara = new Image();
        foto.src = revision.imagen_base;
        mascara.src = revision.mapa_revision;
        Promise.all([foto.decode(), mascara.decode()])
            .then(() => {
                const canvas = lienzo.current;
                if (!activo || !canvas) return;
                const ctx = canvas.getContext('2d', {
                    willReadFrequently: true,
                });
                if (
                    !ctx ||
                    foto.width !== mascara.width ||
                    foto.height !== mascara.height
                ) {
                    throw new Error();
                }
                canvas.width = mascara.width;
                canvas.height = mascara.height;
                ctx.drawImage(mascara, 0, 0);
                const mapa = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                );
                ctx.drawImage(foto, 0, 0);
                const base = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                );
                const visible = new ImageData(
                    new Uint8ClampedArray(base.data),
                    canvas.width,
                    canvas.height,
                );
                const datos = {
                    mapa,
                    base,
                    visible,
                    automatico: mapa.data.slice(),
                    afectados: revision.area_lesion_px,
                };
                for (let i = 0; i < mapa.data.length; i += 4)
                    mostrarPixel(datos, i);
                capas.current = datos;
                ctx.putImageData(visible, 0, 0);
                setListo(true);
            })
            .catch(() => {
                if (activo)
                    setError(
                        'No se pudo abrir la máscara. Vuelve a analizar la foto.',
                    );
            });
        return () => {
            activo = false;
            capas.current = null;
        };
    }, [revision]);

    // Cambiar de vista solo repinta: lo corregido sigue en las capas
    useEffect(() => {
        const datos = capas.current;
        const ctx = lienzo.current?.getContext('2d');

        if (!listo || !datos || !ctx) return;

        ctx.putImageData(
            vista === 'original' ? datos.base : datos.visible,
            0,
            0,
        );
    }, [vista, listo]);

    function pintar(evento: PointerEvent<HTMLCanvasElement>, iniciar: boolean) {
        const canvas = evento.currentTarget;
        const datos = capas.current;
        // Sobre la foto original no se pinta: no se vería lo que haces
        if (!datos || bloqueado || vista === 'original' || !evento.isPrimary)
            return;
        if (iniciar) {
            if (evento.button !== 0) return;
            canvas.setPointerCapture(evento.pointerId);
        } else if (trazo.current?.id !== evento.pointerId) return;

        const marco = canvas.getBoundingClientRect();
        const punto = {
            x: ((evento.clientX - marco.left) * canvas.width) / marco.width,
            y: ((evento.clientY - marco.top) * canvas.height) / marco.height,
        };
        const desde = iniciar ? punto : trazo.current!.punto;
        trazo.current = { id: evento.pointerId, punto };
        const radio = diametro / 2;
        const x0 = Math.max(0, Math.floor(Math.min(desde.x, punto.x) - radio));
        const y0 = Math.max(0, Math.floor(Math.min(desde.y, punto.y) - radio));
        const x1 = Math.min(
            canvas.width,
            Math.ceil(Math.max(desde.x, punto.x) + radio),
        );
        const y1 = Math.min(
            canvas.height,
            Math.ceil(Math.max(desde.y, punto.y) + radio),
        );
        if (x0 >= x1 || y0 >= y1) return;
        const dx = punto.x - desde.x;
        const dy = punto.y - desde.y;
        const longitud2 = dx * dx + dy * dy;
        const valor = modo === 'marcar' ? 255 : 128;
        // Distancia al segmento entre eventos para que un movimiento rápido deje un trazo continuo.
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = 4 * (y * canvas.width + x);
                if (!datos.mapa.data[i] || datos.mapa.data[i] === valor)
                    continue;
                const px = x + 0.5 - desde.x;
                const py = y + 0.5 - desde.y;
                const t = longitud2
                    ? Math.max(0, Math.min(1, (px * dx + py * dy) / longitud2))
                    : 0;
                if ((px - t * dx) ** 2 + (py - t * dy) ** 2 > radio ** 2)
                    continue;
                datos.mapa.data[i] = valor;
                datos.afectados += valor === 255 ? 1 : -1;
                mostrarPixel(datos, i);
            }
        }
        canvas
            .getContext('2d')
            ?.putImageData(datos.visible, 0, 0, x0, y0, x1 - x0, y1 - y0);
        setAfectados(datos.afectados);
    }

    function restablecer() {
        const datos = capas.current;
        if (!datos) return;
        datos.mapa.data.set(datos.automatico);
        for (let i = 0; i < datos.mapa.data.length; i += 4)
            mostrarPixel(datos, i);
        if (vista === 'lesiones') {
            lienzo.current?.getContext('2d')?.putImageData(datos.visible, 0, 0);
        }
        datos.afectados = revision.area_lesion_px;
        setAfectados(datos.afectados);
    }

    async function confirmar() {
        const datos = capas.current;
        if (!datos || bloqueado) return;
        setEnviando(true);
        setError('');
        try {
            const salida = document.createElement('canvas');
            salida.width = datos.mapa.width;
            salida.height = datos.mapa.height;
            const ctx = salida.getContext('2d');
            if (!ctx) throw new Error();
            const binaria = ctx.createImageData(salida.width, salida.height);
            for (let i = 0; i < binaria.data.length; i += 4) {
                const valor = datos.mapa.data[i] === 255 ? 255 : 0;
                binaria.data.fill(valor, i, i + 3);
                binaria.data[i + 3] = 255;
            }
            ctx.putImageData(binaria, 0, 0);
            const blob = await new Promise<Blob | null>((resolve) =>
                salida.toBlob(resolve, 'image/png'),
            );
            if (!blob) throw new Error();
            await onConfirmar(
                new File([blob], 'mascara.png', { type: 'image/png' }),
            );
        } catch {
            setError('No se pudo aplicar la máscara. Intenta de nuevo.');
        } finally {
            setEnviando(false);
        }
    }

    return (
        /* Mismo armazón que la vista previa de la foto: la caja, el alto y el
           botón de la esquina no se mueven al entrar aquí, para que revisar el
           daño se sienta como seguir en la misma página y no como otra pantalla. */
        <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-xl bg-muted">
                {/* La foto tal cual, mientras el lienzo se prepara: sin esto la
                    tarjeta se encogería un instante y la página daría un salto */}
                {!listo && (
                    <img
                        src={revision.imagen_base}
                        alt=""
                        aria-hidden="true"
                        className="mx-auto block h-auto max-h-[26rem] w-auto max-w-full"
                    />
                )}

                <canvas
                    ref={lienzo}
                    aria-label={
                        vista === 'lesiones'
                            ? 'Foto del tallo con máscara de daño editable'
                            : 'Foto original del tallo'
                    }
                    className={cn(
                        'mx-auto block h-auto max-h-[26rem] w-auto max-w-full touch-none',
                        vista === 'lesiones'
                            ? 'cursor-crosshair'
                            : 'cursor-default',
                        // Oculto y fuera del flujo hasta que tiene contenido, para
                        // que la foto de arriba marque el alto de la caja
                        !listo && 'absolute inset-0 m-auto opacity-0',
                    )}
                    onPointerDown={(e) => pintar(e, true)}
                    onPointerMove={(e) => pintar(e, false)}
                    onLostPointerCapture={() => {
                        trazo.current = null;
                    }}
                />

                {/* Donde estaba "Quitar" en la vista previa */}
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={bloqueado}
                    onClick={onVolver}
                    className="absolute top-3 right-3 shadow-sm"
                >
                    Volver
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-semibold tabular-nums">
                        {porcentaje} % de daño
                    </p>
                    {severidad && (
                        <div className="flex items-center gap-2">
                            <NivelBadge
                                nivel={severidad.nivel}
                                ultimoNivel={ultimoNivel}
                            />
                            <span className="text-sm">
                                {severidad.etiqueta}
                            </span>
                        </div>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    disabled={!listo || bloqueado}
                    onClick={restablecer}
                >
                    Restablecer detección
                </Button>
            </div>

            {/* Herramientas bajo la foto, en el lugar de los botones de cámara */}
            <div className="flex flex-wrap items-center gap-3">
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={modo}
                    onValueChange={(valor) => valor && setModo(valor)}
                    disabled={bloqueado || vista === 'original'}
                    aria-label="Herramienta de corrección"
                >
                    <ToggleGroupItem value="borrar">
                        Borrar daño
                    </ToggleGroupItem>
                    <ToggleGroupItem value="marcar">
                        Marcar daño
                    </ToggleGroupItem>
                </ToggleGroup>
                <label className="flex items-center gap-2 text-sm">
                    Pincel ({diametro} px)
                    <input
                        type="range"
                        min="2"
                        max="96"
                        step="2"
                        value={diametro}
                        disabled={bloqueado || vista === 'original'}
                        onChange={(e) => setDiametro(Number(e.target.value))}
                    />
                </label>

                {/* Ver la foto sin el rojo encima, como en la vista de resultado */}
                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={vista}
                    onValueChange={(valor) =>
                        valor && setVista(valor as typeof vista)
                    }
                    className="ml-auto"
                    aria-label="Qué se ve en la foto"
                >
                    <ToggleGroupItem value="lesiones" className="px-3">
                        Lesiones
                    </ToggleGroupItem>
                    <ToggleGroupItem value="original" className="px-3">
                        Original
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <p className="text-sm text-muted-foreground">
                {vista === 'lesiones'
                    ? 'Las zonas rojas cuentan como daño. Arrastra el pincel sobre el tallo para corregirlas.'
                    : 'Esta es la foto original, sin marcas. Vuelve a «Lesiones» para seguir corrigiendo.'}
            </p>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            {/* Mismo sitio y mismo tamaño que el botón "Analizar tallo" */}
            <Button
                type="button"
                size="lg"
                disabled={!listo || bloqueado}
                onClick={confirmar}
            >
                {bloqueado && <Spinner />}
                {bloqueado
                    ? 'Aplicando…'
                    : puedeGuardar
                      ? 'Guardar escaneo'
                      : 'Ver resultado'}
            </Button>
        </div>
    );
}
