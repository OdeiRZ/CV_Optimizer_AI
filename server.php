<?php

/*
 * Router de `php artisan serve`: Laravel lo usa en lugar del suyo cuando
 * existe este archivo en la raíz del proyecto (ServeCommand). Es lo que
 * sirve la app en producción (ver el CMD del Dockerfile), y el servidor
 * integrado de PHP entrega los archivos estáticos sin ninguna cabecera de
 * caché - y no deja ponérsela desde el router si devuelve `false` -: app.js
 * (126 KB comprimido) y la fuente se volvían a descargar enteros en cada
 * carga completa de la página.
 *
 * Por eso aquí se sirven los estáticos a mano, con su tipo, su caché y
 * respuesta 304; todo lo demás va al router de Laravel de siempre.
 */

$publicPath = realpath(getcwd());

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$file = $uri !== '/' ? realpath($publicPath.$uri) : false;

if (
    in_array($method, ['GET', 'HEAD'], true)
    && $file !== false
    && is_file($file)
    // Nunca fuera de public/ (rutas con ..), y los .php no se entregan
    // como texto: siguen el camino de siempre.
    && str_starts_with($file, $publicPath.DIRECTORY_SEPARATOR)
    && pathinfo($file, PATHINFO_EXTENSION) !== 'php'
) {
    $types = [
        'js' => 'text/javascript',
        'css' => 'text/css',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'pdf' => 'application/pdf',
        'webmanifest' => 'application/manifest+json',
        'json' => 'application/json',
        'map' => 'application/json',
        'txt' => 'text/plain; charset=UTF-8',
        'html' => 'text/html; charset=UTF-8',
    ];

    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $modified = filemtime($file);
    $size = filesize($file);
    $etag = '"'.dechex($modified).'-'.dechex($size).'"';

    // Los archivos de /build llevan el hash del contenido en el nombre: si
    // cambian, cambia la URL, así que pueden guardarse un año sin riesgo.
    // El resto (favicon, CV de ejemplo) puede cambiar sin cambiar de nombre,
    // y se revalida cada hora.
    header(
        str_starts_with($uri, '/build/assets/')
            ? 'Cache-Control: public, max-age=31536000, immutable'
            : 'Cache-Control: public, max-age=3600'
    );
    header('ETag: '.$etag);
    header('Last-Modified: '.gmdate('D, d M Y H:i:s', $modified).' GMT');
    header('Content-Type: '.($types[$extension] ?? 'application/octet-stream'));

    if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? null) === $etag) {
        http_response_code(304);

        return true;
    }

    header('Content-Length: '.$size);

    if ($method === 'GET') {
        readfile($file);
    }

    return true;
}

return require __DIR__.'/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php';
