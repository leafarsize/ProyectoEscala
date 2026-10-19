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
    | Un nivel aplica cuando el porcentaje de daño es menor que "hasta".
    | Rangos PROVISIONALES: pendientes de validar con el asesor.
    |
    */

    'niveles' => [
        ['nivel' => 0, 'etiqueta' => 'Sano', 'hasta' => 1],
        ['nivel' => 1, 'etiqueta' => 'Leve', 'hasta' => 5],
        ['nivel' => 2, 'etiqueta' => 'Moderado bajo', 'hasta' => 10],
        ['nivel' => 3, 'etiqueta' => 'Moderado alto', 'hasta' => 25],
        ['nivel' => 4, 'etiqueta' => 'Severo', 'hasta' => 50],
        ['nivel' => 5, 'etiqueta' => 'Muy severo', 'hasta' => null],
    ],

];
