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
            return Limit::perDay(10)
                ->by($request->user()?->id ?: $this->clientIp($request))
                ->response(function (Request $request, array $headers) {
                    return back()->withErrors([
                        'cv' => 'Has alcanzado el límite de 10 análisis diarios. Inténtalo de nuevo mañana.',
                    ])->withHeaders($headers);
                });
        });
    }

    /**
     * Render sits behind Cloudflare, so a request reaching the app has
     * already passed through Cloudflare's edge and Render's own internal
     * load balancer. With trustProxies(at: '*') (needed elsewhere for
     * correct HTTPS scheme detection - see bootstrap/app.php), every hop
     * in that chain is trusted, which leaves Symfony's client-IP
     * resolution with no "untrusted" hop to anchor on: $request->ip()
     * ends up returning Render's own internal load-balancer address
     * instead of the visitor's IP - and that address isn't even stable
     * request-to-request, which was silently defeating this rate limiter
     * (confirmed live: 11 consecutive requests, zero blocked). Cloudflare
     * sets CF-Connecting-IP to the real visitor IP regardless of proxy
     * trust config, so prefer that when present.
     */
    protected function clientIp(Request $request): ?string
    {
        return $request->header('CF-Connecting-IP') ?: $request->ip();
    }
}
