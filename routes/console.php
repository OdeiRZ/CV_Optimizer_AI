<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Ver README > Seguridad: el proyecto trata como una ventaja no acumular
// indefinidamente CVs reales de terceros. Sin esto, esa frase solo era
// cierta para el archivo (que desaparece por el disco efimero de Render,
// no por diseno) - la fila en Postgres con el CV reflejado en `result` se
// quedaba para siempre.
Schedule::command('cv-analyses:prune')->daily();
