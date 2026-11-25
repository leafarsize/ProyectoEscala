import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/** Quita acentos y pasa a minúsculas para búsquedas tolerantes. */
export function normalizarTexto(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/** Verifica que una cadena AAAA-MM-DD corresponda a una fecha real del calendario. */
export function esFechaIsoValida(valor: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const [anio, mes, dia] = valor.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
    );
}

/** Días entre dos fechas AAAA-MM-DD válidas; null si alguna falta o están invertidas. */
export function diasEntreFechas(inicio: string, fin: string): number | null {
    if (!esFechaIsoValida(inicio) || !esFechaIsoValida(fin) || fin < inicio) {
        return null;
    }

    const [ai, mi, di] = inicio.split('-').map(Number);
    const [af, mf, df] = fin.split('-').map(Number);
    const ms = Date.UTC(af, mf - 1, df) - Date.UTC(ai, mi - 1, di);

    return Math.round(ms / 86_400_000);
}

/** Valida formato y orden cronológico de un par de fechas AAAA-MM-DD opcionales. */
export function validarRangoFechas(
    inicio: string,
    fin: string,
    mensajes: {
        inicioInvalida?: string;
        finInvalida?: string;
        invertidas?: string;
    } = {},
): { inicio?: string; fin?: string } {
    const errores: { inicio?: string; fin?: string } = {};

    if (inicio && !esFechaIsoValida(inicio)) {
        errores.inicio = mensajes.inicioInvalida ?? 'Elige una fecha válida.';
    }

    if (fin && !esFechaIsoValida(fin)) {
        errores.fin = mensajes.finInvalida ?? 'Elige una fecha válida.';
    }

    if (!errores.inicio && !errores.fin && inicio && fin && fin < inicio) {
        errores.fin =
            mensajes.invertidas ??
            'La fecha de término no puede ser anterior a la de inicio.';
    }

    return errores;
}
