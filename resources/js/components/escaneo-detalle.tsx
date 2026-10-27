import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/** Escaneo tal como lo envía Escaneo::paraVista() */
export type EscaneoVista = {
    id: number;
    porcentaje: number;
    nivel: number;
    etiqueta: string;
    fecha: string;
    usuario: string;
    imagen_original: string;
    imagen_resaltada: string;
};

export const formatoFecha = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export const formatoDia = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: 'UTC',
});

export function NivelBadge({
    nivel,
    ultimoNivel,
}: {
    nivel: number;
    ultimoNivel: number;
}) {
    // Pastillas pastel como el "Código de colores" de Nexo: verde bajo, ámbar medio, rojo alto
    const color =
        nivel >= ultimoNivel - 1
            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            : nivel <= 1
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

    return (
        <Badge
            className={`rounded-full border-transparent tabular-nums ${color}`}
        >
            Nivel {nivel} de {ultimoNivel}
        </Badge>
    );
}

/**
 * Ventana con la foto del escaneo en grande y el cambio entre lesiones y original.
 */
export function DetalleEscaneo({
    escaneo,
    titulo,
    ultimoNivel,
    onCerrar,
}: {
    escaneo: EscaneoVista | null;
    titulo?: string;
    ultimoNivel: number;
    onCerrar: () => void;
}) {
    const [vista, setVista] = useState<'lesiones' | 'original'>('lesiones');

    return (
        <Dialog
            open={escaneo !== null}
            onOpenChange={(abierto) => {
                if (!abierto) {
                    onCerrar();
                    setVista('lesiones');
                }
            }}
        >
            {escaneo && (
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex flex-wrap items-center gap-2">
                            {titulo && <span>{titulo} ·</span>}
                            {escaneo.porcentaje.toFixed(1)} % de daño ·{' '}
                            {escaneo.etiqueta}
                            <NivelBadge
                                nivel={escaneo.nivel}
                                ultimoNivel={ultimoNivel}
                            />
                        </DialogTitle>
                        <DialogDescription>
                            {formatoFecha.format(new Date(escaneo.fecha))} ·{' '}
                            {escaneo.usuario}
                        </DialogDescription>
                    </DialogHeader>

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
                                    ? escaneo.imagen_resaltada
                                    : escaneo.imagen_original
                            }
                            alt={
                                vista === 'lesiones'
                                    ? 'Tallo con las lesiones resaltadas en rojo'
                                    : 'Foto original del tallo'
                            }
                            className="mx-auto max-h-[60vh] w-full object-contain"
                        />
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}
