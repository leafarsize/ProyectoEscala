import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Recuadro con título en la línea del borde ("INFORMACIÓN DEL ALUMNO" en Nexo).
 */
export function Seccion({
    titulo,
    children,
    className,
}: {
    titulo: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <fieldset
            className={cn(
                'min-w-0 rounded-lg border px-3 pt-1 pb-4 sm:px-5 sm:pb-5',
                className,
            )}
        >
            <legend className="px-2 text-sm font-bold text-foreground/80 uppercase">
                {titulo}
            </legend>
            {children}
        </fieldset>
    );
}
