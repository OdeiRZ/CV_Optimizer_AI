<?php

it('sends a Content-Security-Policy header with a script nonce', function () {
    $response = $this->get('/');

    $csp = $response->headers->get('Content-Security-Policy');

    expect($csp)->not->toBeNull()
        ->and($csp)->toContain("default-src 'self'")
        ->and($csp)->toContain("object-src 'none'");

    preg_match("/script-src 'self' 'nonce-([^']+)'/", $csp, $matches);
    expect($matches)->toHaveCount(2);

    // The same nonce the header allows must be the one actually stamped on
    // the page's inline <script>, or the browser would still block it.
    $nonce = $matches[1];
    $response->assertSee("nonce=\"{$nonce}\"", false);
});

it('does not send a Content-Security-Policy header in local development', function () {
    app()->detectEnvironment(fn () => 'local');

    $response = $this->get('/');

    expect($response->headers->has('Content-Security-Policy'))->toBeFalse();
});
