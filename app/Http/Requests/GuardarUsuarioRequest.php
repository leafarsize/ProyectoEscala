<?php

namespace App\Http\Requests;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Rol;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GuardarUsuarioRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'rol' => ['required', Rule::enum(Rol::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Escribe el nombre del usuario.',
            'email.required' => 'Escribe el correo del usuario.',
            'email.email' => 'Ese correo no tiene un formato válido.',
            'email.unique' => 'Ya existe una cuenta con ese correo.',
            'password.required' => 'Escribe una contraseña temporal.',
            'password.confirmed' => 'Las dos contraseñas no coinciden.',
            'rol.required' => 'Elige un rol.',
        ];
    }
}
