import { Head, Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { Seccion } from '@/components/seccion';
import { useMenuPrincipal } from '@/hooks/use-menu-principal';
import { toUrl } from '@/lib/utils';
import { dashboard } from '@/routes';

export default function Dashboard() {
    // Los mosaicos son el mismo menú del rol, sin el propio Dashboard
    const servicios = useMenuPrincipal().filter(
        (item) => toUrl(item.href) !== toUrl(dashboard()),
    );

    return (
        <>
            <Head title="Inicio" />
            <div className="flex flex-col gap-8 p-5 md:p-10">
                <h1 className="text-center text-2xl font-bold tracking-tight text-primary uppercase">
                    Bienvenido(a)
                </h1>

                <Seccion titulo="Servicios">
                    <ul className="grid gap-3 pt-2 sm:grid-cols-2">
                        {servicios.map((item) => (
                            <li key={item.title}>
                                <Link
                                    href={item.href}
                                    className="group flex items-center gap-4 rounded-lg border bg-card px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    {item.icon && (
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <item.icon className="size-5" />
                                        </span>
                                    )}
                                    <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {item.title}
                                    </span>
                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Seccion>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Inicio',
            href: dashboard(),
        },
    ],
};
