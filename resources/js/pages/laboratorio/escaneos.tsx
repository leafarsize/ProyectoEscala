import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { escaneos } from '@/routes/laboratorio';

export default function Escaneos() {
    return (
        <>
            <Head title="Escaneos" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title="Escaneos"
                    description="Historial de escaneos de tallos del laboratorio."
                />
                <p className="text-sm text-muted-foreground">
                    Próximamente (Sprint 3). Visible para laboratoristas y para
                    el Jefe de laboratorio.
                </p>
            </div>
        </>
    );
}

Escaneos.layout = {
    breadcrumbs: [
        {
            title: 'Escaneos',
            href: escaneos(),
        },
    ],
};
