import { cn } from '@/lib/utils';

/**
 * Logos del TecNM y del Instituto Tecnológico de Tepic separados por una línea, como en Nexo.
 */
export function LogosTec({ className }: { className?: string }) {
    return (
        <span className={cn('flex items-center gap-3', className)}>
            <img
                src="/images/TecNM-140w.png"
                alt="Tecnológico Nacional de México"
                className="h-9 w-auto dark:rounded dark:bg-white dark:p-0.5"
            />
            <span className="h-8 w-px bg-border" />
            <img
                src="/images/ittepic-135w.png"
                alt="Instituto Tecnológico de Tepic"
                className="size-9"
            />
        </span>
    );
}
