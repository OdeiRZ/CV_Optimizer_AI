<?php

use Symfony\Component\Process\Process;

/**
 * El router de producción (server.php, el que usa `php artisan serve`) se
 * prueba con un servidor PHP de verdad: sin él, los estáticos salían sin
 * cabeceras de caché. Se arranca en un puerto libre y se para al terminar.
 */
function startStaticServer(): array
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    $port = (int) explode(':', stream_socket_get_name($socket, false))[1];
    fclose($socket);

    $server = new Process(
        [PHP_BINARY, '-S', "127.0.0.1:{$port}", base_path('server.php')],
        public_path(),
    );
    $server->start();

    for ($i = 0; $i < 50 && @fsockopen('127.0.0.1', $port) === false; $i++) {
        usleep(100_000);
    }

    return [$server, "http://127.0.0.1:{$port}"];
}

/** @return array{0: int, 1: array<string, string>} */
function staticRequest(string $url, array $headers = []): array
{
    $context = stream_context_create(['http' => [
        'ignore_errors' => true,
        'header' => implode("\r\n", $headers),
    ]]);

    @file_get_contents($url, false, $context);

    preg_match('/\s(\d{3})\s/', $http_response_header[0] ?? '', $status);
    $parsed = [];
    foreach (array_slice($http_response_header ?? [], 1) as $line) {
        [$name, $value] = array_pad(explode(':', $line, 2), 2, '');
        $parsed[strtolower(trim($name))] = trim($value);
    }

    return [(int) ($status[1] ?? 0), $parsed];
}

it('serves static files with a cache header and answers 304 to an unchanged one', function () {
    [$server, $base] = startStaticServer();

    try {
        [$status, $headers] = staticRequest("{$base}/favicon.ico");

        expect($status)->toBe(200)
            ->and($headers['cache-control'])->toBe('public, max-age=3600')
            ->and($headers['content-type'])->toBe('image/x-icon')
            ->and($headers)->toHaveKey('etag');

        [$status] = staticRequest("{$base}/favicon.ico", ["If-None-Match: {$headers['etag']}"]);

        expect($status)->toBe(304);
    } finally {
        $server->stop();
    }
});

it('keeps hashed build assets for a year', function () {
    $assets = glob(public_path('build/assets/*.js'));

    if ($assets === [] || $assets === false) {
        $this->markTestSkipped('The frontend has not been built.');
    }

    [$server, $base] = startStaticServer();

    try {
        [$status, $headers] = staticRequest("{$base}/build/assets/".basename($assets[0]));

        expect($status)->toBe(200)
            ->and($headers['cache-control'])->toBe('public, max-age=31536000, immutable');
    } finally {
        $server->stop();
    }
});

it('does not serve files outside public/ and sends the app routes to Laravel', function () {
    [$server, $base] = startStaticServer();

    try {
        [$status] = staticRequest("{$base}/../composer.json");
        expect($status)->toBeIn([400, 404]);

        [$status, $headers] = staticRequest("{$base}/");
        expect($status)->toBe(200)
            ->and($headers['cache-control'])->not->toContain('immutable');
    } finally {
        $server->stop();
    }
});
