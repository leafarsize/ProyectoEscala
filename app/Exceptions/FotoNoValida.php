<?php

namespace App\Exceptions;

use Exception;

/**
 * La foto no se puede analizar (sin tallo, oscura, desenfocada...).
 * El mensaje está pensado para mostrarse al usuario.
 */
class FotoNoValida extends Exception {}
