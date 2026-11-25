import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn, normalizarTexto } from '@/lib/utils';

export type TratamientoComboOpcion = {
    id: number;
    nombre: string;
    variedad: string | null;
    lote: string | null;
    escaneos: number;
};

function describirTratamiento(t: TratamientoComboOpcion): string {
    const etiqueta = [t.nombre, t.variedad, t.lote].filter(Boolean).join(' · ');
    const sufijo = `${t.escaneos} ${t.escaneos === 1 ? 'escaneo' : 'escaneos'}`;

    return `${etiqueta} (${sufijo})`;
}

/**
 * Selector con buscador integrado para elegir un tratamiento abierto existente.
 */
export function ComboboxTratamiento({
    id,
    valor,
    opciones,
    deshabilitado = false,
    placeholder = 'Elige un tratamiento abierto',
    onCambio,
}: {
    id: string;
    valor: string;
    opciones: TratamientoComboOpcion[];
    deshabilitado?: boolean;
    placeholder?: string;
    onCambio: (valor: string) => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [indiceActivo, setIndiceActivo] = useState(0);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const buscadorRef = useRef<HTMLInputElement>(null);

    const seleccionado = useMemo(
        () => opciones.find((t) => String(t.id) === valor) ?? null,
        [opciones, valor],
    );

    const filtradas = useMemo(() => {
        const termino = normalizarTexto(busqueda.trim());

        if (!termino) {
            return opciones;
        }

        return opciones.filter((t) =>
            normalizarTexto(
                [t.nombre, t.variedad, t.lote].filter(Boolean).join(' '),
            ).includes(termino),
        );
    }, [opciones, busqueda]);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        const timer = setTimeout(() => {
            buscadorRef.current?.focus();
        }, 0);

        const alHacerClicFuera = (evento: MouseEvent) => {
            if (
                contenedorRef.current &&
                !contenedorRef.current.contains(evento.target as Node)
            ) {
                setAbierto(false);
            }
        };

        document.addEventListener('mousedown', alHacerClicFuera);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', alHacerClicFuera);
        };
    }, [abierto]);

    useEffect(() => {
        setIndiceActivo(0);
    }, [busqueda, abierto]);

    const elegir = (opcion: TratamientoComboOpcion) => {
        onCambio(String(opcion.id));
        setAbierto(false);
        setBusqueda('');
    };

    const manejarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
        if (!abierto) {
            return;
        }

        if (evento.key === 'Escape') {
            evento.preventDefault();
            setAbierto(false);
            return;
        }

        if (evento.key === 'ArrowDown') {
            evento.preventDefault();
            setIndiceActivo((prev) =>
                filtradas.length === 0 ? 0 : (prev + 1) % filtradas.length,
            );
            return;
        }

        if (evento.key === 'ArrowUp') {
            evento.preventDefault();
            setIndiceActivo((prev) =>
                filtradas.length === 0
                    ? 0
                    : (prev - 1 + filtradas.length) % filtradas.length,
            );
            return;
        }

        if (evento.key === 'Enter' && filtradas[indiceActivo]) {
            evento.preventDefault();
            elegir(filtradas[indiceActivo]);
        }
    };

    return (
        <div
            ref={contenedorRef}
            onKeyDown={manejarTecla}
            className="relative w-full"
        >
            <button
                id={id}
                type="button"
                role="combobox"
                aria-expanded={abierto}
                aria-controls={`${id}-lista`}
                aria-haspopup="listbox"
                disabled={deshabilitado}
                onClick={() => setAbierto((prev) => !prev)}
                className={cn(
                    'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50',
                    !seleccionado && 'text-muted-foreground',
                )}
            >
                <span className="truncate">
                    {seleccionado
                        ? describirTratamiento(seleccionado)
                        : placeholder}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </button>

            {abierto && (
                <div className="absolute right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="relative border-b p-2">
                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={buscadorRef}
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar tratamiento..."
                            aria-label="Buscar tratamiento existente"
                            className="h-8 pr-8 pl-8 text-sm"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                aria-label="Borrar búsqueda"
                                className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    <ul
                        id={`${id}-lista`}
                        role="listbox"
                        aria-label="Tratamientos abiertos"
                        className="max-h-60 overflow-y-auto p-1"
                    >
                        {filtradas.length === 0 ? (
                            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No se encontraron tratamientos.
                            </li>
                        ) : (
                            filtradas.map((t, idx) => {
                                const esSeleccionado = String(t.id) === valor;
                                const esActivo = idx === indiceActivo;

                                return (
                                    <li
                                        key={t.id}
                                        role="option"
                                        aria-selected={esSeleccionado}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => elegir(t)}
                                            onMouseEnter={() =>
                                                setIndiceActivo(idx)
                                            }
                                            className={cn(
                                                'flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors',
                                                esActivo
                                                    ? 'bg-accent text-accent-foreground'
                                                    : 'hover:bg-accent/60',
                                            )}
                                        >
                                            <span className="truncate">
                                                {describirTratamiento(t)}
                                            </span>
                                            {esSeleccionado && (
                                                <Check className="size-4 shrink-0 text-primary" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
