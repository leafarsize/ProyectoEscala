import { useEffect, useState } from 'react';
import { EtiquetaCampo } from '@/components/info-ayuda';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validarRangoFechas } from '@/lib/utils';

export type RangoFechas = {
    /** AAAA-MM-DD, o cadena vacía si ese extremo no acota */
    desde: string;
    hasta: string;
};

/**
 * Rango «iniciados desde / hasta» por fecha de inicio del tratamiento. Lo
 * comparten el historial y la comparación para que el filtro se vea y se
 * comporte igual en las dos pantallas.
 */
export function FiltroFechas({
    desde,
    hasta,
    onCambio,
    idPrefijo = 'filtro',
    etiquetaDesde = 'Iniciados desde',
    etiquetaHasta = 'Iniciados hasta',
}: {
    desde: string;
    hasta: string;
    /** Se llama solo con el extremo que cambió, para que la página consulte */
    onCambio: (cambios: Partial<RangoFechas>) => void;
    /** Distingue los ids cuando hay más de un rango en la misma pantalla */
    idPrefijo?: string;
    /** Cada pantalla nombra el rango como le acomoda a su contexto */
    etiquetaDesde?: string;
    etiquetaHasta?: string;
}) {
    const [valorDesde, setValorDesde] = useState(desde);
    const [valorHasta, setValorHasta] = useState(hasta);
    const [error, setError] = useState('');

    useEffect(() => {
        setValorDesde(desde);
        setValorHasta(hasta);
        setError('');
    }, [desde, hasta]);

    const manejarCambio = (campo: 'desde' | 'hasta', nuevoValor: string) => {
        const siguienteDesde = campo === 'desde' ? nuevoValor : valorDesde;
        const siguienteHasta = campo === 'hasta' ? nuevoValor : valorHasta;

        setValorDesde(siguienteDesde);
        setValorHasta(siguienteHasta);

        const errores = validarRangoFechas(siguienteDesde, siguienteHasta, {
            inicioInvalida: `La fecha de «${etiquetaDesde}» no es válida.`,
            finInvalida: `La fecha de «${etiquetaHasta}» no es válida.`,
            invertidas: `La fecha de «${etiquetaDesde}» no puede ser posterior a «${etiquetaHasta}».`,
        });

        const mensaje = errores.inicio ?? errores.fin ?? '';
        setError(mensaje);

        if (!mensaje) {
            onCambio({ [campo]: nuevoValor });
        }
    };

    return (
        <>
            <div className="grid gap-1.5">
                <EtiquetaCampo
                    htmlFor={`${idPrefijo}-desde`}
                    etiqueta={etiquetaDesde}
                    ayuda="Filtra los tratamientos cuya fecha de inicio esté dentro de este rango."
                />
                <Input
                    id={`${idPrefijo}-desde`}
                    type="date"
                    value={valorDesde}
                    max={valorHasta || undefined}
                    aria-invalid={Boolean(error) || undefined}
                    onChange={(e) => manejarCambio('desde', e.target.value)}
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefijo}-hasta`}>{etiquetaHasta}</Label>
                <Input
                    id={`${idPrefijo}-hasta`}
                    type="date"
                    value={valorHasta}
                    min={valorDesde || undefined}
                    aria-invalid={Boolean(error) || undefined}
                    onChange={(e) => manejarCambio('hasta', e.target.value)}
                />
            </div>

            {error && (
                <div className="sm:col-span-2">
                    <InputError message={error} />
                </div>
            )}
        </>
    );
}
