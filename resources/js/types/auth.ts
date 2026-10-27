/** Valores de App\Enums\Rol */
export type Rol = 'laboratorista' | 'productor' | 'jefe_laboratorio';

/** Lo que comparte HandleInertiaRequests en auth.user */
export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    rol: Rol;
    rol_etiqueta: string;
};

export type Auth = {
    user: User;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

/* @chisel-2fa */
export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
/* @end-chisel-2fa */
