<?php

namespace App\Http\Requests;

use App\Concerns\ProfileValidationRules;
use App\Enums\Rol;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActualizarUsuarioRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $reglas = [
            'name' => $this->nameRules(),
            // Se ignora al propio usuario: si no cambia el correo, no debe chocar consigo mismo
            'email' => $this->emailRules($this->usuarioId()),
        ];

        // Nadie cambia su propio rol ni se desactiva, así que el formulario no los envía
        if ($this->esMiCuenta()) {
            return $reglas;
        }

        return [
            ...$reglas,
            'rol' => ['required', Rule::enum(Rol::class)],
            'activo' => ['required', 'boolean'],
        ];
    }

    /**
     * ¿El jefe se está editando a sí mismo?
     */
    public function esMiCuenta(): bool
    {
        return $this->usuarioId() === $this->user()?->id;
    }

    /**
     * Id del usuario que se está editando, tomado de la URL.
     */
    public function usuarioId(): int
    {
        return (int) $this->route('usuario');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Escribe el nombre del usuario.',
            'email.required' => 'Escribe el correo del usuario.',
            'email.email' => 'Ese correo no tiene un formato válido.',
            'email.unique' => 'Ya existe otra cuenta con ese correo.',
            'rol.required' => 'Elige un rol.',
            'activo.required' => 'Elige el estado de la cuenta.',
        ];
    }
}
