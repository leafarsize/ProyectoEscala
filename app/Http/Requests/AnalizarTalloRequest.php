<?php

namespace App\Http\Requests;

use App\Enums\Rol;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AnalizarTalloRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $reglas = [
            // mimes revisa el contenido real del archivo, no solo la extensión
            'imagen' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:'.config('escala.max_kb')],
        ];

        // El productor solo obtiene el análisis; no inicia tratamientos ni se guarda su escaneo
        if (! $this->guardaEscaneo()) {
            return $reglas;
        }

        return [
            ...$reglas,
            // Escaneo de un tratamiento existente…
            'tratamiento_id' => ['nullable', 'integer', 'exists:tratamientos,id'],
            // …o el primero de un tratamiento nuevo
            'nombre' => ['required_without:tratamiento_id', 'nullable', 'string', 'max:255'],
            'variedad' => ['required_without:tratamiento_id', 'nullable', 'string', 'max:100'],
            'lote' => ['required_without:tratamiento_id', 'nullable', 'string', 'max:100'],
            'productor_id' => [
                'nullable', 'integer',
                Rule::exists('usuarios', 'id')->where('rol', Rol::Productor->value)->where('activo', true),
            ],
        ];
    }

    /**
     * Laboratoristas y Jefe de laboratorio guardan cada escaneo en un tratamiento.
     */
    public function guardaEscaneo(): bool
    {
        return $this->user()?->tieneRol(Rol::Laboratorista, Rol::JefeLaboratorio) ?? false;
    }

    /**
     * Registra por qué se rechazó el archivo (p. ej. límite upload_max_filesize de PHP).
     */
    protected function failedValidation(Validator $validator): void
    {
        $archivo = $this->file('imagen');
        $archivo = $archivo instanceof UploadedFile ? $archivo : null;

        Log::info('Imagen rechazada por la validación', [
            'errores' => $validator->errors()->get('imagen'),
            'archivo' => $archivo?->getClientOriginalName(),
            'tipo_cliente' => $archivo?->getClientMimeType(),
            'tipo_real' => $archivo?->isValid() ? $archivo->getMimeType() : null,
            'kb' => $archivo ? round($archivo->getSize() / 1024) : null,
            'error_subida' => $archivo?->isValid() === false ? $archivo->getErrorMessage() : null,
        ]);

        parent::failedValidation($validator);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'imagen.required' => 'Toma o importa una foto del tallo.',
            'imagen.file' => 'No se pudo subir la imagen. Intenta de nuevo.',
            'imagen.uploaded' => 'No se pudo subir la imagen. Intenta de nuevo.',
            'imagen.mimes' => 'Formato no válido. Usa una imagen JPG, PNG o WEBP.',
            'imagen.max' => 'La imagen supera el tamaño máximo de 10 MB.',
            'tratamiento_id.exists' => 'El tratamiento no existe.',
            'nombre.required_without' => 'Escribe el nombre del tratamiento.',
            'variedad.required_without' => 'Escribe la variedad de caña.',
            'lote.required_without' => 'Escribe el lote o parcela.',
            'productor_id.exists' => 'Elige un productor válido.',
        ];
    }
}
