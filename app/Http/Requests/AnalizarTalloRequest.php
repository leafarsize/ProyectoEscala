<?php

namespace App\Http\Requests;

use App\Enums\Rol;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
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
            'revisar' => ['sometimes', 'boolean'],
            'mascara' => ['bail', 'sometimes', 'file', 'mimes:png', 'max:2048', 'dimensions:max_width=1280,max_height=1280'],
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
            // Solo los valores de config/escala.php, para que los tratamientos sean comparables
            'temperatura' => ['nullable', Rule::in(Config::array('escala.temperaturas'))],
            // Incubación: se eligen en el calendario. La duración en días se calcula con las dos.
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => [
                'nullable',
                'date',
                $this->filled('fecha_inicio') ? 'after_or_equal:fecha_inicio' : 'after_or_equal:today',
            ],
            // Identifica el tallo de la foto; se pide en cada escaneo, no solo en el primero
            'numero_cana' => ['required', 'string', 'max:50'],
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
            'mascara.mimes' => 'La máscara corregida debe ser una imagen PNG.',
            'mascara.dimensions' => 'El tamaño de la máscara supera el de la imagen analizada.',
            'mascara.max' => 'La máscara corregida supera el tamaño permitido.',
            'tratamiento_id.exists' => 'El tratamiento no existe.',
            'nombre.required_without' => 'Escribe el nombre del tratamiento.',
            'numero_cana.required' => 'Escribe el número de caña.',
            'productor_id.exists' => 'Elige un productor válido.',
            'temperatura.in' => 'Elige una temperatura de la lista.',
            'fecha_inicio.date' => 'Elige una fecha de inicio válida.',
            'fecha_fin.date' => 'Elige una fecha de término válida.',
            'fecha_fin.after_or_equal' => 'La fecha de término no puede ser anterior a la de inicio.',
        ];
    }
}
