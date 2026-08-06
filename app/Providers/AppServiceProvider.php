<?php

namespace App\Providers;

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
        RateLimiter::for('cv-analysis', function (Request $request) {
            \Illuminate\Support\Facades\Log::info('rate-limit-debug', [
                'ip' => $request->ip(),
                'ips' => $request->ips(),
                'xff' => $request->header('X-Forwarded-For'),
                'cf_connecting_ip' => $request->header('CF-Connecting-IP'),
                'true_client_ip' => $request->header('True-Client-IP'),
            ]);

            return Limit::perDay(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return back()->withErrors([
                        'cv' => 'Has alcanzado el límite de 10 análisis diarios. Inténtalo de nuevo mañana.',
                    ])->withHeaders($headers);
                });
        });
    }
}
