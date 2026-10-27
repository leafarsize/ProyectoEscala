import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

// Estilo de Nexo: inputs altos con ícono que se vuelve naranja al enfocar
const campo =
    'h-12 rounded-xl border-2 bg-muted pl-12 text-base transition-all duration-200 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-primary/20 md:text-base';
const icono =
    'pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary';
const etiqueta = 'text-sm font-semibold text-tec-marino dark:text-foreground';

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Iniciar sesión" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className={etiqueta}>
                                    Correo electrónico
                                </Label>
                                <div className="group relative">
                                    <Mail className={icono} />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="correo@ejemplo.com"
                                        className={campo}
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className={etiqueta}>
                                    Contraseña
                                </Label>
                                <div className="group relative">
                                    <Lock className={`${icono} z-10`} />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Tu contraseña"
                                        className={`${campo} pr-12`}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        tabIndex={3}
                                    />
                                    <Label htmlFor="remember">Recordarme</Label>
                                </div>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-sm text-muted-foreground no-underline hover:text-primary hover:underline"
                                        tabIndex={5}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </TextLink>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="group mt-2 h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-tec-marino hover:shadow-xl hover:shadow-primary/30"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Iniciar sesión
                                {!processing && (
                                    <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Iniciar sesión',
    description: 'Ingresa tus credenciales para continuar',
};
