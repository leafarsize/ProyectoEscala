<?php

namespace App\Http\Requests;

use App\Enums\Rol;
use App\Models\Tratamiento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\Rule;

/**
 * Edición de la ficha de un tratamiento ya iniciado. Los escaneos no se tocan:
 * aquí solo se corrigen los datos del ensayo (nombre, condiciones, fechas, notas)
 * y se abre o cierra para seguir admitiendo escaneos.
 */
class ActualizarTratamientoRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:255'],
            // Solo los valores de config/escala.php, para que los tratamientos sean comparables
            'temperatura' => ['nullable', Rule::in(Config::array('escala.temperaturas'))],
            'variedad' => ['nullable', 'string', 'max:100'],
            'lote' => ['nullable', 'string', 'max:100'],
            // Incubación: se eligen en el calendario y la duración en días se calcula con las dos
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
            'productor_id' => [
                'nullable', 'integer',
                Rule::exists('usuarios', 'id')->where('rol', Rol::Productor->value)->where('activo', true),
            ],
            'notas' => ['nullable', 'string', 'max:2000'],
            // Cerrado: el tratamiento ya no admite escaneos nuevos
            'estado' => ['required', Rule::in([Tratamiento::ABIERTO, Tratamiento::CERRADO])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'Escribe el nombre del tratamiento.',
            'temperatura.in' => 'Elige una temperatura de la lista.',
            'fecha_inicio.required' => 'Elige la fecha de inicio.',
            'fecha_inicio.date' => 'Elige una fecha de inicio válida.',
            'fecha_fin.date' => 'Elige una fecha de término válida.',
            'fecha_fin.after_or_equal' => 'La fecha de término no puede ser anterior a la de inicio.',
            'productor_id.exists' => 'Elige un productor válido.',
            'notas.max' => 'Las notas no pueden pasar de 2000 caracteres.',
            'estado.required' => 'Elige si el tratamiento queda abierto o cerrado.',
            'estado.in' => 'El estado debe ser abierto o cerrado.',
        ];
    }
}
