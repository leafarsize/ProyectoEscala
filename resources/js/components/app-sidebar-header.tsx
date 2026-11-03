import { Link } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LogosTec } from '@/components/logos-tec';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
                <div className="hidden md:block">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                {/* Logo institucional en móvil */}
                <Link
                    href={dashboard()}
                    className="flex items-center gap-2.5 md:hidden"
                >
                    <img
                        src="/images/cana-escala.png"
                        alt=""
                        className="size-7 object-contain"
                    />
                    <span className="text-sm font-bold tracking-wider text-foreground">
                        PROYECTO ESCALA
                    </span>
                </Link>
            </div>
            <div className="flex items-center gap-3">
                <LogosTec />
            </div>
        </header>
    );
}
