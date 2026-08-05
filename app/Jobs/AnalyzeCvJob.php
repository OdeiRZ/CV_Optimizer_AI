<?php

namespace App\Jobs;

use App\Enums\CvAnalysisStatus;
use App\Models\CvAnalysis;
use App\Services\CvAnalysisSchema;
use App\Services\CvTextExtractor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Facades\Prism;
use Throwable;

class AnalyzeCvJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 120;

    public function __construct(
        public CvAnalysis $analysis,
    ) {}

    public function handle(CvTextExtractor $extractor): void
    {
        $this->analysis->update(['status' => CvAnalysisStatus::Processing]);

        try {
            $cvText = $extractor->extract('local', $this->analysis->file_path);

            $response = Prism::structured()
                ->using(config('cv.analysis_provider'), config('cv.analysis_model'))
                ->withSchema(CvAnalysisSchema::make())
                ->withPrompt($this->buildPrompt($cvText, $this->analysis->job_description))
                ->withMaxTokens(4096)
                // Low temperature: the score should stay reasonably reproducible for the
                // same CV across separate analyses, not swing wildly run to run.
                ->usingTemperature(0.2)
                ->asStructured();

            $this->analysis->update([
                'status' => CvAnalysisStatus::Completed,
                'result' => $response->structured,
            ]);
        } catch (Throwable $e) {
            Log::error('CV analysis failed', [
                'cv_analysis_id' => $this->analysis->id,
                'exception' => $e->getMessage(),
            ]);

            $this->analysis->update([
                'status' => CvAnalysisStatus::Failed,
                'error_message' => 'No se ha podido analizar el CV. Inténtalo de nuevo en unos minutos.',
            ]);

            throw $e;
        }
    }

    protected function buildPrompt(string $cvText, ?string $jobDescription): string
    {
        $prompt = <<<PROMPT
            Eres un experto en recursos humanos y en sistemas ATS (Applicant Tracking System).
            Analiza el siguiente CV y devuelve una evaluación honesta, concreta y accionable, siempre en español.

            CV:
            ---
            {$cvText}
            ---

            Evalúa el formato y estructura, la claridad de la experiencia (impacto cuantificado, verbos de acción
            fuertes frente a frases pasivas o genéricas como "responsable de"), y la compatibilidad con sistemas ATS
            (uso de palabras clave relevantes para el sector, estructura que un ATS pueda parsear correctamente).

            Identifica entre 3 y 5 de las líneas de experiencia más débiles del CV y reescríbelas de forma más fuerte
            (voz activa, resultados cuantificados cuando sea razonable inferirlos o marcados como estimables).
            PROMPT;

        if (filled($jobDescription)) {
            $prompt .= <<<PROMPT


                El candidato aspira a la siguiente oferta de trabajo. Ten en cuenta sus requisitos al evaluar el CV
                y usa este campo para identificar palabras clave o habilidades importantes de la oferta que no
                aparecen en el CV.

                Oferta de trabajo:
                ---
                {$jobDescription}
                ---
                PROMPT;
        } else {
            $prompt .= "\n\nNo se ha proporcionado ninguna oferta de trabajo: deja el campo de palabras clave ausentes como un array vacío.";
        }

        return $prompt;
    }
}
