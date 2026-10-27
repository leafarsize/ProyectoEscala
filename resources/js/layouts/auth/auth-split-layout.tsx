import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/**
 * Pantallas de acceso de Escala: fondo del campus con el logo del programa
 * y la tarjeta del formulario centrada en medio de la pantalla.
 */
export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
            <img
                src="/images/login-back.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-tec-marino/65" />

            <div className="relative z-10 flex w-full max-w-md flex-col items-center">
                <Link
                    href={home()}
                    className="flex flex-col items-center gap-4"
                >
                    <span className="flex size-24 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/5">
                        <img
                            src="/images/cana-escala.png"
                            alt=""
                            className="h-16 w-auto"
                        />
                    </span>
                    <span className="text-2xl font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                        PROYECTO ESCALA
                    </span>
                </Link>

                <div className="mt-6 w-full rounded-xl border bg-card p-8 shadow-xl">
                    <div className="mb-8">
                        <h1 className="text-lg font-semibold text-tec-marino dark:text-foreground">
                            {title}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>

                <img
                    src="/images/logos-white.png"
                    alt="Tecnológico Nacional de México - Instituto Tecnológico de Tepic"
                    className="mt-8 w-52 opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
            </div>
        </div>
    );
}
