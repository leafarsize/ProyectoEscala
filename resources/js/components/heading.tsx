import { cn } from '@/lib/utils';

export default function Heading({
    title,
    description,
    variant = 'default',
    as: Titulo = 'h2',
    className,
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    className?: string;
}) {
    return (
        <header
            className={cn(variant === 'small' ? '' : 'space-y-1', className)}
        >
            <Titulo
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-semibold'
                        : 'text-2xl font-bold tracking-tight text-primary uppercase'
                }
            >
                {title}
            </Titulo>
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
        </header>
    );
}
