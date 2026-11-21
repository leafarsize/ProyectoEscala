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
        <div className="relative flex h-dvh items-center justify-center overflow-hidden px-4 py-6">
            <img
                src="/images/login-back.jpg"
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-[3px]"
            />
            <div className="absolute inset-0 bg-tec-marino/65" />

            <div className="relative z-10 flex w-full max-w-md flex-col items-center">
                <Link
                    href={home()}
                    className="flex animate-in flex-col items-center gap-3 duration-700 fade-in slide-in-from-top-4"
                >
                    <span className="flex size-20 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/5">
                        <img
                            src="/images/cana-escala.png"
                            alt=""
                            className="h-14 w-auto"
                        />
                    </span>
                    <span className="text-2xl font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                        PROYECTO ESCALA
                    </span>
                </Link>

                <div className="mt-5 w-full animate-in rounded-xl border bg-card p-8 shadow-xl duration-700 fade-in slide-in-from-bottom-4">
                    <div className="mb-6">
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
                    className="mt-6 w-48 animate-in opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] delay-300 duration-1000 fade-in"
                />
            </div>
        </div>
    );
}
