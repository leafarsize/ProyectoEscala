import { Info } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Icono discreto de información junto a una etiqueta de formulario: muestra la
 * ayuda al pasar el cursor, enfocar o tocar el botón, evitando saturar la vista
 * con párrafos debajo de cada campo.
 */
export function InfoAyuda({
    texto,
    etiqueta,
}: {
    texto: string;
    etiqueta?: string;
}) {
    const [abierto, setAbierto] = useState(false);

    return (
        <Tooltip open={abierto} onOpenChange={setAbierto}>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={
                        etiqueta
                            ? `Información sobre ${etiqueta}`
                            : 'Más información'
                    }
                    onClick={(e) => {
                        e.preventDefault();
                        setAbierto((prev) => !prev);
                    }}
                    className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Info className="size-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent>
                <p className="leading-snug">{texto}</p>
            </TooltipContent>
        </Tooltip>
    );
}

/**
 * Etiqueta de campo con icono de información opcional a su lado.
 */
export function EtiquetaCampo({
    htmlFor,
    etiqueta,
    ayuda,
}: {
    htmlFor: string;
    etiqueta: ReactNode;
    ayuda?: string;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <Label htmlFor={htmlFor}>{etiqueta}</Label>
            {ayuda && (
                <InfoAyuda
                    texto={ayuda}
                    etiqueta={
                        typeof etiqueta === 'string' ? etiqueta : undefined
                    }
                />
            )}
        </div>
    );
}
