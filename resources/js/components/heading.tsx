import { cn } from '@/lib/utils';

export default function Heading({
    title,
    description,
    variant = 'default',
    className,
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
    className?: string;
}) {
    return (
        <header
            className={cn(variant === 'small' ? '' : 'space-y-1', className)}
        >
            <h2
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-semibold'
                        : 'text-2xl font-bold tracking-tight text-primary uppercase'
                }
            >
                {title}
            </h2>
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
        </header>
    );
}
