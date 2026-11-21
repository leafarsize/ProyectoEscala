import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type RangoFechas = {
    /** AAAA-MM-DD, o cadena vacía si ese extremo no acota */
    desde: string;
    hasta: string;
};

/**
 * Rango «iniciados desde / hasta» por fecha de inicio del tratamiento. Lo
 * comparten el historial y la comparación para que el filtro se vea y se
 * comporte igual en las dos pantallas.
 *
 * Son dos celdas sueltas (un fragmento, no un contenedor): así cada pantalla las
 * acomoda en su propia rejilla de filtros sin heredar un ancho ajeno.
 *
 * Cada campo acota el extremo contrario (`max` y `min`), de modo que no se puede
 * pedir un rango al revés. Los dos extremos son inclusivos.
 */
export function FiltroFechas({
    desde,
    hasta,
    onCambio,
    idPrefijo = 'filtro',
    etiquetaDesde = 'Inicio',
    etiquetaHasta = 'Fin',
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
    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefijo}-desde`}>{etiquetaDesde}</Label>
                <Input
                    id={`${idPrefijo}-desde`}
                    type="date"
                    value={desde}
                    max={hasta || undefined}
                    onChange={(e) => onCambio({ desde: e.target.value })}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`${idPrefijo}-hasta`}>{etiquetaHasta}</Label>
                <Input
                    id={`${idPrefijo}-hasta`}
                    type="date"
                    value={hasta}
                    min={desde || undefined}
                    onChange={(e) => onCambio({ hasta: e.target.value })}
                />
            </div>
        </>
    );
}
