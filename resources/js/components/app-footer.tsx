import { usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { LogosTec } from '@/components/logos-tec';

export function AppFooter() {
    const { name } = usePage().props;

    return (
        <footer className="border-t bg-card">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3">
                    <LogosTec />
                    <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0" />
                        Instituto Tecnológico de Tepic Av. Tecnológico #2595,
                        Col. Lagos del Country, Tepic, Nayarit
                    </p>
                </div>
                <p>
                    © {new Date().getFullYear()} {name} Análisis de daño en
                    tallos de caña
                </p>
            </div>
        </footer>
    );
}
