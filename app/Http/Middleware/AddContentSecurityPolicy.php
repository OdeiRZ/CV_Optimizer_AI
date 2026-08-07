<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class AddContentSecurityPolicy
{
    /**
     * Skipped in local development: Vite's HMR client needs an open
     * connect-src to its own dev server for the hot-reload websocket, and a
     * nonce can't exempt that - nonces only cover <script>/<style> elements,
     * not fetch/WebSocket connections. Not worth relaxing the policy to keep
     * that working, since local dev isn't public attack surface anyway.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Generated unconditionally (cheap) so app.blade.php always has a
        // value to stamp onto its own inline script and the @routes(nonce:)
        // directive - Vite::useCspNonce() also makes the @vite() and
        // @viteReactRefresh directives nonce their own generated <script>
        // tags automatically, so this one call covers all of them.
        $nonce = Vite::useCspNonce();

        $response = $next($request);

        if (app()->environment('local')) {
            return $response;
        }

        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}'",
            // Inline `style` attributes are only ever used for the upload
            // progress bar's width - not worth a nonce dance for something
            // that can't execute JS, so it's just allowed outright.
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "font-src 'self' https://fonts.bunny.net",
            "img-src 'self' data:",
            "connect-src 'self'",
            "frame-src 'self'",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
        ]));

        return $response;
    }
}
