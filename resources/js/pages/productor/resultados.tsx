import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { resultados } from '@/routes/productor';

export default function Resultados() {
    return (
        <>
            <Head title="Mis resultados" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title="Mis resultados"
                    description="Porcentaje de daño de los tratamientos de tu cultivo."
                />
                <p className="text-sm text-muted-foreground">
                    Próximamente. Solo el Productor puede ver esta sección.
                </p>
            </div>
        </>
    );
}

Resultados.layout = {
    breadcrumbs: [
        {
            title: 'Mis resultados',
            href: resultados(),
        },
    ],
};
