<?php

namespace App\Providers;

use App\Support\CvAnalysisRateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Public demo hitting a paid LLM API: cap analyses per user/IP per day.
        // A custom response is required here: without it, the 429 comes back
        // as a raw non-Inertia response that the frontend has no way to show,
        // so the upload silently appears to do nothing. Routing it through
        // withErrors() reuses the same `errors.cv` slot the upload form
        // already renders for validation errors.
        RateLimiter::for(CvAnalysisRateLimiter::LIMITER_NAME, function (Request $request) {
            $limit = config('cv.daily_analysis_limit');

            return Limit::perDay($limit)
                ->by(CvAnalysisRateLimiter::key($request))
                ->response(function (Request $request, array $headers) use ($limit) {
                    return back()->withErrors([
                        'cv' => "Has alcanzado el límite de {$limit} análisis diarios. Inténtalo de nuevo mañana.",
                    ])->withHeaders($headers);
                });
        });

        // The report/file routes don't call the paid LLM, so they don't need
        // the daily cap above - but they had no limit at all (a security
        // audit finding): anyone with an analysis's ULID could hit
        // downloadReport() (DomPDF, real CPU cost) or previewFile()
        // (bandwidth) as many times as they liked. Generous per-minute cap,
        // same Cloudflare-aware visitor identity as the daily one - a real
        // page view only ever needs a couple of hits (the preview iframe
        // loads once, a download click is one more), this only stops a
        // tight loop hammering either endpoint.
        RateLimiter::for('cv-analysis-asset', function (Request $request) {
            return Limit::perMinute(30)->by(CvAnalysisRateLimiter::key($request));
        });
    }
}
