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
    }
}
