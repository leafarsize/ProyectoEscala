import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { usuarios } from '@/routes/jefe';

export default function Usuarios() {
    return (
        <>
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title="Usuarios"
                    description="Alta y desactivación de laboratoristas y productores."
                />
                <p className="text-sm text-muted-foreground">
                    Próximamente (Sprint 5). Solo el Jefe de laboratorio puede
                    ver esta sección.
                </p>
            </div>
        </>
    );
}

Usuarios.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: usuarios(),
        },
    ],
};
