import { Form, Head, Link, router } from '@inertiajs/react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import UsuariosController from '@/actions/App/Http/Controllers/UsuariosController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
    create as rutaCrear,
    destroy,
    index as rutaUsuarios,
} from '@/routes/jefe/usuarios';

interface Usuario {
    id: number;
    name: string;
    email: string;
    rol: string;
    rol_etiqueta: string;
    activo: boolean;
    es_tu_cuenta: boolean;
    /** false si ya dejó historial: las claves foráneas impiden borrarlo */
    puede_eliminar: boolean;
}

interface RolOpcion {
    value: string;
    label: string;
}

/** Mismo alto y foco que el <Input> de shadcn, pero en un <select> nativo. */
const clasesSelect =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** Color del badge por rol, para distinguir al jefe de un vistazo. */
const variantePorRol: Record<string, 'default' | 'secondary' | 'outline'> = {
    jefe_laboratorio: 'default',
    laboratorista: 'secondary',
    productor: 'outline',
};

/** "Ana Pérez López" -> "AP" */
function iniciales(nombre: string): string {
    return nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() ?? '')
        .join('');
}

export default function Usuarios({
    usuarios,
    roles,
}: {
    usuarios: Usuario[];
    roles: RolOpcion[];
}) {
    const [editando, setEditando] = useState<Usuario | null>(null);
    const activos = usuarios.filter((usuario) => usuario.activo).length;

    return (
        <>
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-6 p-5 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Usuarios"
                        description="Toca una fila para editar la cuenta, cambiar el rol o eliminarla."
                    />
                    <Button asChild>
                        <Link href={rutaCrear()}>
                            <UserPlus />
                            Nuevo usuario
                        </Link>
                    </Button>
                </div>

                {usuarios.length === 0 ? (
                    <SinUsuarios />
                ) : (
                    <>
                        <Card className="overflow-hidden py-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                            <th className="px-4 py-3 font-medium">
                                                Usuario
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Rol
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {usuarios.map((usuario) => (
                                            <tr
                                                key={usuario.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setEditando(usuario)
                                                }
                                                onKeyDown={(evento) => {
                                                    if (
                                                        evento.key ===
                                                            'Enter' ||
                                                        evento.key === ' '
                                                    ) {
                                                        evento.preventDefault();
                                                        setEditando(usuario);
                                                    }
                                                }}
                                                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                                            {iniciales(
                                                                usuario.name,
                                                            )}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate font-medium">
                                                                    {
                                                                        usuario.name
                                                                    }
                                                                </span>
                                                                {usuario.es_tu_cuenta && (
                                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                                        (tú)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="truncate text-xs text-muted-foreground">
                                                                {usuario.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            variantePorRol[
                                                                usuario.rol
                                                            ] ?? 'outline'
                                                        }
                                                    >
                                                        {usuario.rol_etiqueta}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <EstadoCuenta
                                                        activo={usuario.activo}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                    </>
                )}
            </div>

            <Dialog
                open={editando !== null}
                onOpenChange={(abierto) => {
                    if (!abierto) {
                        setEditando(null);
                    }
                }}
            >
                <DialogContent>
                    {editando && (
                        <ModalUsuario
                            key={editando.id}
                            usuario={editando}
                            roles={roles}
                            onCerrar={() => setEditando(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function EstadoCuenta({ activo }: { activo: boolean }) {
    return (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span
                className={cn(
                    'size-2 rounded-full',
                    activo ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                )}
            />
            <span className={activo ? '' : 'text-muted-foreground'}>
                {activo ? 'Activa' : 'Desactivada'}
            </span>
        </span>
    );
}

/**
 * Contenido del modal, con dos vistas: el formulario de edición y, al pulsar
 * Eliminar, la confirmación. El padre lo remonta por cada usuario (key), así que
 * su estado interno siempre arranca limpio.
 */
function ModalUsuario({
    usuario,
    roles,
    onCerrar,
}: {
    usuario: Usuario;
    roles: RolOpcion[];
    onCerrar: () => void;
}) {
    const [confirmando, setConfirmando] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const eliminar = () => {
        router.delete(destroy(usuario.id).url, {
            preserveScroll: true,
            onStart: () => setEliminando(true),
            onFinish: () => setEliminando(false),
            onSuccess: onCerrar,
        });
    };

    if (confirmando) {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>¿Eliminar a «{usuario.name}»?</DialogTitle>
                    <DialogDescription>
                        Se borrará la cuenta de {usuario.email} de forma
                        permanente. Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setConfirmando(false)}
                    >
                        Volver
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={eliminando}
                        onClick={eliminar}
                    >
                        {eliminando && <Spinner />}
                        Eliminar usuario
                    </Button>
                </DialogFooter>
            </>
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Editar usuario</DialogTitle>
                <DialogDescription>
                    {usuario.es_tu_cuenta
                        ? 'Es tu propia cuenta: no puedes cambiar tu rol ni desactivarte.'
                        : 'Cambia los datos, el rol o el estado de la cuenta.'}
                </DialogDescription>
            </DialogHeader>

            <Form
                {...UsuariosController.update.form(usuario.id)}
                options={{ preserveScroll: true }}
                onSuccess={onCerrar}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="editar-name">Nombre</Label>
                            <Input
                                id="editar-name"
                                name="name"
                                defaultValue={usuario.name}
                                required
                                autoComplete="name"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="editar-email">Correo</Label>
                            <Input
                                id="editar-email"
                                name="email"
                                type="email"
                                defaultValue={usuario.email}
                                required
                                autoComplete="off"
                            />
                            <InputError message={errors.email} />
                        </div>

                        {usuario.es_tu_cuenta ? (
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">
                                        Rol
                                    </span>
                                    <Badge
                                        variant={
                                            variantePorRol[usuario.rol] ??
                                            'outline'
                                        }
                                        className="w-fit"
                                    >
                                        {usuario.rol_etiqueta}
                                    </Badge>
                                </div>
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium">
                                        Estado
                                    </span>
                                    <div className="text-sm">
                                        <EstadoCuenta activo={usuario.activo} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="editar-rol">Rol</Label>
                                    <select
                                        id="editar-rol"
                                        name="rol"
                                        defaultValue={usuario.rol}
                                        required
                                        className={clasesSelect}
                                    >
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

                                <div className="grid gap-2">
                                    <Label htmlFor="editar-activo">
                                        Estado
                                    </Label>
                                    <select
                                        id="editar-activo"
                                        name="activo"
                                        defaultValue={
                                            usuario.activo ? '1' : '0'
                                        }
                                        required
                                        className={clasesSelect}
                                    >
                                        <option value="1">Activa</option>
                                        <option value="0">Desactivada</option>
                                    </select>
                                    <InputError message={errors.activo} />
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:justify-between">
                            {usuario.puede_eliminar ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setConfirmando(true)}
                                >
                                    <Trash2 />
                                    Eliminar
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground">
                                    {usuario.es_tu_cuenta
                                        ? 'No puedes eliminar tu propia cuenta.'
                                        : 'Ya tiene historial: solo se puede desactivar.'}
                                </span>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onCerrar}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Guardar
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </Form>
        </>
    );
}

function SinUsuarios() {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Todavía no hay usuarios registrados.
                </p>
                <Button asChild>
                    <Link href={rutaCrear()}>Crear el primero</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

Usuarios.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: rutaUsuarios(),
        },
    ],
};
