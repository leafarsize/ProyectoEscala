<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class AnalizarHojaRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // mimes revisa el contenido real del archivo, no solo la extensión
            'imagen' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:'.config('escala.max_kb')],
        ];
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
            'imagen.required' => 'Toma o importa una foto de la hoja.',
            'imagen.file' => 'No se pudo subir la imagen. Intenta de nuevo.',
            'imagen.uploaded' => 'No se pudo subir la imagen. Intenta de nuevo.',
            'imagen.mimes' => 'Formato no válido. Usa una imagen JPG, PNG o WEBP.',
            'imagen.max' => 'La imagen supera el tamaño máximo de 10 MB.',
        ];
    }
}
