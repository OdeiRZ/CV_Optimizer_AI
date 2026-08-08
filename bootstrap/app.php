<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\AddContentSecurityPolicy::class,
        ]);

        // Render (and similar PaaS platforms) terminate TLS at their own
        // proxy and forward plain HTTP internally; without this, Laravel
        // generates http:// asset/URL links behind an https:// page.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // TEMPORARY diagnostic for the Lighthouse-CI 404 mystery. Remove
        // once root-caused.
        $exceptions->report(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Illuminate\Support\Facades\Log::warning('DIAGNOSTIC: model not found', [
                'message' => $e->getMessage(),
            ]);
        });
    })->create();
