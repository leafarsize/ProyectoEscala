<?php

$venv = PHP_OS_FAMILY === 'Windows'
    ? base_path('python/.venv/Scripts/python.exe')
    : base_path('python/.venv/bin/python');

return [

    /*
    |--------------------------------------------------------------------------
    | Análisis de tallos con Python
    |--------------------------------------------------------------------------
    |
    | Laravel ejecuta python/analizar_tallo.py con este intérprete. Por defecto
    | usa el entorno virtual python/.venv (ver python/requirements.txt).
    |
    */

    'python' => env('ESCALA_PYTHON', file_exists($venv) ? $venv : 'python'),

    'script' => base_path('python/analizar_tallo.py'),

    'timeout' => (int) env('ESCALA_TIMEOUT', 60),

    // Tamaño máximo de la imagen en kilobytes (10 MB)
    'max_kb' => 10240,

    /*
    |--------------------------------------------------------------------------
    | Escala de severidad (0 a 5)
    |--------------------------------------------------------------------------
    |
    | Escala diagramática de la tesis de Natalia Tapia (ITTepic, 2026, Fig. 7.1):
    | cada nivel tiene un % representativo ("referencia") y su descripción.
    | Un nivel aplica cuando el porcentaje de daño es menor que "hasta".
    |
    | La tesis no define los cortes entre niveles: se usa el punto medio entre
    | los % representativos (0, 7, 11, 18, 28, 44). PENDIENTE confirmar con Natalia.
    | Si cambian, actualizar también CORTES en python/evaluacion/evaluar.py.
    |
    */

    'niveles' => [
        ['nivel' => 0, 'etiqueta' => 'Sano', 'referencia' => 0, 'hasta' => 3.5,
            'descripcion' => 'Sin manchas visibles.'],
        ['nivel' => 1, 'etiqueta' => 'Leve', 'referencia' => 7, 'hasta' => 9,
            'descripcion' => 'Pequeñas lesiones iniciales de coloración tenue.'],
        ['nivel' => 2, 'etiqueta' => 'Moderado bajo', 'referencia' => 11, 'hasta' => 14.5,
            'descripcion' => 'Aumento en la extensión de las manchas, con coloración clara.'],
        ['nivel' => 3, 'etiqueta' => 'Moderado alto', 'referencia' => 18, 'hasta' => 23,
            'descripcion' => 'Manchas más definidas y extendidas que afectan una porción mayor de la superficie.'],
        ['nivel' => 4, 'etiqueta' => 'Severo', 'referencia' => 28, 'hasta' => 36,
            'descripcion' => 'Manchas más extensas con oscurecimiento y posible hundimiento de la fibra.'],
        ['nivel' => 5, 'etiqueta' => 'Muy severo', 'referencia' => 44, 'hasta' => null,
            'descripcion' => 'Daño severo: necrosis con lesiones extendidas y fusión de manchas.'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Usuarios de prueba
    |--------------------------------------------------------------------------
    |
    | Contraseña de las cuentas que crea database/seeders/UsuariosSeeder.php.
    | Sin valor por defecto a propósito: nunca debe quedar en el repositorio.
    |
    */

    'seed_password' => env('SEED_PASSWORD'),

];
