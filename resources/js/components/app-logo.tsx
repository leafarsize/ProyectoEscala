import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10">
                <img
                    src="/images/cana-escala.png"
                    alt=""
                    className="size-6 object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-bold text-foreground">
                    {name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Escala
                </span>
            </div>
        </>
    );
}
