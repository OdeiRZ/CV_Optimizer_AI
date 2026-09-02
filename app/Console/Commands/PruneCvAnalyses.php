<?php

namespace App\Console\Commands;

use App\Models\CvAnalysis;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneCvAnalyses extends Command
{
    protected $signature = 'cv-analyses:prune {--days=30 : Antiguedad minima, en dias, antes de borrar un analisis}';

    protected $description = 'Borra los analisis de CV (fila + archivo subido) mas antiguos que --days, para no acumular CVs reales de terceros indefinidamente en la base de datos';

    public function handle(): int
    {
        $cutoff = now()->subDays((int) $this->option('days'));
        $borrados = 0;

        CvAnalysis::where('created_at', '<', $cutoff)->chunkById(100, function ($analyses) use (&$borrados) {
            foreach ($analyses as $analysis) {
                if (Storage::exists($analysis->file_path)) {
                    Storage::delete($analysis->file_path);
                }

                $analysis->delete();
                $borrados++;
            }
        });

        $this->info("Borrados {$borrados} analisis de CV anteriores a {$cutoff->toDateString()}.");

        return self::SUCCESS;
    }
}
