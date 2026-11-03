import { Clock, Mail, Phone } from 'lucide-react';

const SITIOS_INTERES = [
    { nombre: 'Tecnológico de Tepic', url: 'https://www.ittepic.edu.mx/' },
    { nombre: 'EVE', url: 'https://eve.ittepic.edu.mx/' },
    { nombre: 'Ciencias Básicas', url: 'https://cb.ittepic.edu.mx/' },
    { nombre: 'Posgrado', url: 'https://posgrado.ittepic.edu.mx/' },
    {
        nombre: 'Laboratorio Nacional (LANAEPI)',
        url: 'https://www.ittepic.edu.mx/',
    },
    { nombre: 'Perfil de emergencias', url: 'https://www.ittepic.edu.mx/' },
];

export function AppFooter() {
    const anioActual = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {/* 3 Columnas de información */}
                <div className="grid grid-cols-1 gap-8 text-sm md:grid-cols-3">
                    {/* Columna 1: Sitios web de interés */}
                    <div>
                        <h3 className="mb-4 text-base font-bold text-foreground">
                            Sitios web de interés
                        </h3>
                        <ul className="flex flex-col gap-2.5">
                            {SITIOS_INTERES.map((sitio) => (
                                <li key={sitio.nombre}>
                                    <a
                                        href={sitio.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        {sitio.nombre}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Columna 2: Dirección postal */}
                    <div>
                        <h3 className="mb-4 text-base font-bold text-foreground">
                            Dirección postal
                        </h3>
                        <div className="flex flex-col gap-2 text-muted-foreground">
                            <p>Instituto Tecnológico de Tepic</p>
                            <p>Avenida Tecnológico #2595</p>
                            <p>Colonia Lagos del Country</p>
                            <p>Tepic, Nayarit. México. C.P. 63175</p>
                        </div>
                    </div>

                    {/* Columna 3: Contacto */}
                    <div>
                        <h3 className="mb-4 text-base font-bold text-foreground">
                            Contacto
                        </h3>
                        <div className="flex flex-col gap-3 text-muted-foreground">
                            <a
                                href="tel:+523112119400"
                                className="flex items-center gap-2.5 transition-colors hover:text-primary"
                            >
                                <Phone className="size-4 shrink-0 text-muted-foreground" />
                                <span>+52 311 211 9400</span>
                            </a>
                            <a
                                href="mailto:desarrollo.sistemas.cc@ittepic.edu.mx"
                                className="flex items-center gap-2.5 transition-colors hover:text-primary"
                            >
                                <Mail className="size-4 shrink-0 text-muted-foreground" />
                                <span className="break-all">
                                    desarrollo.sistemas.cc@ittepic.edu.mx
                                </span>
                            </a>
                            <div className="flex items-center gap-2.5">
                                <Clock className="size-4 shrink-0 text-muted-foreground" />
                                <span>
                                    Lunes a viernes de 08:00 a 16:00 hrs
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Línea divisoria */}
                <div className="my-8 border-t border-border" />

                {/* Barra inferior: Logo del Centro de Cómputo + Derechos */}
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/centro-de-computo.png"
                            alt="Centro de Cómputo"
                            className="h-9 w-auto object-contain dark:rounded dark:bg-white/95 dark:p-1"
                        />
                    </div>
                    <p className="text-center text-xs text-muted-foreground sm:text-right">
                        © {anioActual} Centro de Cómputo. Todos los derechos
                        reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
