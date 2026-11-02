import { Form, Head, Link } from '@inertiajs/react';
import UsuariosController from '@/actions/App/Http/Controllers/UsuariosController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    create as rutaCrear,
    index as rutaUsuarios,
} from '@/routes/jefe/usuarios';

interface RolOpcion {
    value: string;
    label: string;
}

/** Mismo alto y foco que el <Input> de shadcn, pero en un <select> nativo. */
const clasesSelect =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function CrearUsuario({ roles }: { roles: RolOpcion[] }) {
    return (
        <>
            <Head title="Nuevo usuario" />
            <div className="flex h-full flex-1 flex-col items-center p-5 md:p-8">
                <div className="flex w-full max-w-xl flex-col gap-6">
                    <Heading
                        title="Nuevo usuario"
                        description="La contraseña es temporal: tendrás que comunicársela al usuario."
                    />

                    <Card>
                        <Form
                            {...UsuariosController.store.form()}
                            resetOnSuccess
                            className="flex flex-col gap-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <CardContent className="flex flex-col gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Nombre</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder="Nombre y apellidos"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Correo
                                            </Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                autoComplete="off"
                                                placeholder="persona@escala.test"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="rol">Rol</Label>
                                            <select
                                                id="rol"
                                                name="rol"
                                                required
                                                defaultValue=""
                                                className={clasesSelect}
                                            >
                                                <option value="" disabled>
                                                    Elige un rol
                                                </option>
                                                {roles.map((rol) => (
                                                    <option
                                                        key={rol.value}
                                                        value={rol.value}
                                                    >
                                                        {rol.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.rol} />
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="password">
                                                    Contraseña temporal
                                                </Label>
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    required
                                                    autoComplete="new-password"
                                                />
                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password_confirmation">
                                                    Repítela
                                                </Label>
                                                <Input
                                                    id="password_confirmation"
                                                    name="password_confirmation"
                                                    type="password"
                                                    required
                                                    autoComplete="new-password"
                                                />
                                                <InputError
                                                    message={
                                                        errors.password_confirmation
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="justify-end gap-3 border-t pt-6">
                                        <Button variant="outline" asChild>
                                            <Link href={rutaUsuarios()}>
                                                Cancelar
                                            </Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Creando…'
                                                : 'Crear usuario'}
                                        </Button>
                                    </CardFooter>
                                </>
                            )}
                        </Form>
                    </Card>
                </div>
            </div>
        </>
    );
}

CrearUsuario.layout = {
    breadcrumbs: [
        { title: 'Usuarios', href: rutaUsuarios() },
        { title: 'Nuevo', href: rutaCrear() },
    ],
};
