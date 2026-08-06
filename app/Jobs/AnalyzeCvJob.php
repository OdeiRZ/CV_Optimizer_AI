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
                ->withSchema(CvAnalysisSchema::make($this->analysis->language))
                ->withPrompt($this->buildPrompt($cvText, $this->analysis->job_description))
                ->withMaxTokens(4096)
                // Lowest available temperature: the score should stay as reproducible as
                // possible for the same CV across separate analyses. This reduces but does
                // not eliminate run-to-run variation (see the README caveat on this).
                ->usingTemperature(0)
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
        $languageName = $this->analysis->language->label();

        $prompt = <<<PROMPT
            You are an expert in human resources and ATS (Applicant Tracking System) systems.
            Analyze the following CV and return an honest, concrete and actionable evaluation, always written in {$languageName}.

            CV:
            ---
            {$cvText}
            ---

            Evaluate the format and structure, the clarity of the experience (quantified impact, strong action verbs
            versus passive or generic phrases like "responsible for"), and ATS compatibility (use of keywords
            relevant to the industry, structure that an ATS can parse correctly).

            Identify between 3 and 5 of the weakest experience bullet points in the CV and rewrite them to be
            stronger (active voice, quantified results where reasonable to infer or marked as estimated).
            PROMPT;

        if (filled($jobDescription)) {
            $prompt .= <<<PROMPT


                The candidate is applying to the following job posting. Take its requirements into account when
                evaluating the CV, and use it to identify important keywords or skills from the posting that are
                missing from the CV.

                Job posting:
                ---
                {$jobDescription}
                ---
                PROMPT;
        } else {
            $prompt .= "\n\nNo job posting was provided: leave the missing keywords field as an empty array.";
        }

        return $prompt;
    }
}
