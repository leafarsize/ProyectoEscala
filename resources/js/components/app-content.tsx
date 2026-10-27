import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

export function AppContent({ variant = 'sidebar', children, ...props }: Props) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    // Panel blanco centrado sobre el fondo gris, como las páginas de Nexo
    return (
        <main className="flex-1 px-3 py-6 sm:px-6 md:py-8" {...props}>
            <div className="mx-auto flex w-full max-w-6xl flex-col rounded-xl border bg-card shadow-sm">
                {children}
            </div>
        </main>
    );
}
