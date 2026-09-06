<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Shared between the named rate limiter (AppServiceProvider) and the upload
 * page (CvAnalysisController::create), so both agree on how a visitor is
 * identified and the "remaining today" count reads the exact counter the
 * throttle middleware is actually incrementing.
 */
class CvAnalysisRateLimiter
{
    public const LIMITER_NAME = 'cv-analysis';

    public static function key(Request $request): string
    {
        return (string) ($request->user()?->id ?: static::clientIp($request));
    }

    /**
     * Mirrors ThrottleRequests::handleRequestUsingNamedLimiter()'s own cache
     * key construction (md5($limiterName.$limit->key)), since that's the
     * only way to read the same counter without going through the
     * middleware first.
     */
    public static function remaining(Request $request): int
    {
        $cacheKey = md5(self::LIMITER_NAME.static::key($request));

        return RateLimiter::remaining($cacheKey, config('cv.daily_analysis_limit'));
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
     * request-to-request, which was silently defeating the rate limiter
     * (confirmed live: 11 consecutive requests, zero blocked). Cloudflare
     * sets CF-Connecting-IP to the real visitor IP regardless of proxy
     * trust config, so prefer that when present - but only once it's been
     * through filter_var() below (see that comment for why this alone
     * doesn't close the gap for a request that bypasses Cloudflare
     * entirely and hits Render's own *.onrender.com URL directly).
     */
    public static function clientIp(Request $request): ?string
    {
        $cfConnectingIp = $request->header('CF-Connecting-IP');

        // A genuine Cloudflare-proxied request always carries a real IP
        // here (Cloudflare stamps this header itself, overwriting whatever
        // the client sent) - filter_var() rejects a spoofed non-IP value
        // outright. This does NOT verify the request actually came through
        // Cloudflare: someone hitting Render's own public URL directly
        // controls this header completely and can still send a
        // well-formed but fake IP, still evading the daily limit. Closing
        // that requires a Cloudflare-side check (e.g. a Transform Rule
        // adding a shared-secret header the app can verify) - deliberately
        // not done here, see CHANGELOG.
        if ($cfConnectingIp && filter_var($cfConnectingIp, FILTER_VALIDATE_IP)) {
            return $cfConnectingIp;
        }

        return $request->ip();
    }
}
