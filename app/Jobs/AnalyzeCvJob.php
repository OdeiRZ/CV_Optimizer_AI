<?php

namespace App\Jobs;

use App\Enums\CvAnalysisStatus;
use App\Models\CvAnalysis;
use App\Services\CvAnalysisSchema;
use App\Services\CvTextExtractor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Facades\Prism;
use Throwable;

class AnalyzeCvJob implements ShouldQueue
{
    use Queueable;

    // Only takes effect with a real queue worker (local dev). Production
    // runs with QUEUE_CONNECTION=sync, where a job is invoked directly and
    // this property is never consulted - there's no worker loop to release
    // and re-attempt it. The withClientRetry() call below is what actually
    // protects the production path, at the HTTP-request level.
    public int $tries = 2;

    public int $timeout = 120;

    public function __construct(
        public CvAnalysis $analysis,
        // Same visitor identity the rate limiter uses (App\Support\CvAnalysisRateLimiter::key()),
        // captured from the request at dispatch time since a queued job has
        // no request to read it from later.
        public string $cacheIdentity,
    ) {}

    public function handle(CvTextExtractor $extractor): void
    {
        $this->analysis->update(['status' => CvAnalysisStatus::Processing]);

        try {
            $cvText = $extractor->extract('local', $this->analysis->file_path);

            $cacheKey = $this->resultCacheKey($cvText);

            if ($cached = Cache::get($cacheKey)) {
                $this->analysis->update([
                    'status' => CvAnalysisStatus::Completed,
                    'result' => $cached,
                ]);

                return;
            }

            $response = Prism::structured()
                ->using(config('cv.analysis_provider'), config('cv.analysis_model'))
                ->withSchema(CvAnalysisSchema::make($this->analysis->language))
                ->withPrompt($this->buildPrompt($cvText, $this->analysis->job_description))
                ->withMaxTokens(4096)
                // Lowest available temperature: the score should stay as reproducible as
                // possible for the same CV across separate analyses. This reduces but does
                // not eliminate run-to-run variation (see the README caveat on this).
                ->usingTemperature(0)
                // One retry at the HTTP level for the transient failures actually observed
                // in production (connection timeouts, Anthropic 5xx/429s) - not for 4xx
                // errors like an oversized/malformed request, which would just fail the
                // same way twice while billing for two calls instead of one.
                ->withClientRetry(
                    times: 2,
                    sleepMilliseconds: 1000,
                    when: static::shouldRetryHttpFailure(...),
                )
                ->asStructured();

            Cache::put(
                $cacheKey,
                $response->structured,
                now()->addMinutes(config('cv.result_cache_ttl_minutes')),
            );

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

    /**
     * Only retry transient failures: connection timeouts, or a server-side
     * error/rate-limit response from the provider. A 4xx like an oversized
     * or malformed request would just fail identically on a second attempt,
     * so retrying it would only double the billed API calls for nothing.
     */
    public static function shouldRetryHttpFailure(Throwable $e): bool
    {
        if ($e instanceof ConnectionException) {
            return true;
        }

        return $e instanceof RequestException
            && ($e->response->serverError() || $e->response->status() === 429);
    }

    /**
     * Scoped to the same visitor (matching the rate limiter's own identity)
     * plus the exact CV text, job description, and language - so a retry
     * or accidental double-submit reuses the result instead of paying for
     * another LLM call, but the cache never serves one visitor's analysis
     * to another, even when two people happen to submit byte-identical CV
     * text (e.g. the bundled sample CV via "Try with a sample CV").
     */
    protected function resultCacheKey(string $cvText): string
    {
        return 'cv-analysis-result:'.hash('sha256', implode('|', [
            $this->cacheIdentity,
            $this->analysis->language->value,
            $this->analysis->job_description ?? '',
            $cvText,
        ]));
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
