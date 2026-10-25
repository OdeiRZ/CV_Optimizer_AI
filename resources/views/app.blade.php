<!DOCTYPE html>
{{-- El idioma de la interfaz lo elige el visitante (guardado en su navegador),
     no el servidor: arranca en español y lib/i18n.ts lo actualiza al cambiarlo.
     Con el idioma de Laravel ("en") la página decía estar en inglés aunque se
     viera en español. --}}
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link rel="icon" href="/favicon.ico">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @php($cspNonce = \Illuminate\Support\Facades\Vite::cspNonce())

        <script nonce="{{ $cspNonce }}">
            // Applied before first paint (and before React mounts) so the page
            // never flashes the wrong theme. Dark is the default look of the
            // app, so an unset preference stays dark rather than following
            // prefers-color-scheme.
            // En try/catch: con el almacenamiento bloqueado (navegación
            // privada estricta, cookies desactivadas) localStorage lanza y,
            // sin esto, la página se quedaba en blanco. Sin acceso, oscuro.
            var theme = null;
            try { theme = localStorage.getItem('cv-optimizer-theme'); } catch (e) {}
            if (theme !== 'light') {
                document.documentElement.classList.add('dark');
            }
            try {
                var language = localStorage.getItem('cv-optimizer-language');
                if (language === 'en') { document.documentElement.lang = 'en'; }
            } catch (e) {}
        </script>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{--
            Static, not per-page: the app has no image asset suited to be an
            og:image (a 16px favicon.ico would just render blurry), so this
            stays a text-only card - still far better than the blank/broken
            preview a bare title tag gives most link-unfurlers.
        --}}
        <meta name="description" content="Analizador de CV con IA: sube tu currículum y recibe una puntuación tipo ATS, feedback por sección y reescrituras de tus puntos más débiles.">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name', 'CV Optimizer AI') }}">
        <meta property="og:title" content="{{ config('app.name', 'CV Optimizer AI') }} — Optimiza tu CV con IA">
        <meta property="og:description" content="Sube tu CV y recibe una puntuación tipo ATS, feedback accionable por secciones y reescrituras de tus puntos más débiles.">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:title" content="{{ config('app.name', 'CV Optimizer AI') }} — Optimiza tu CV con IA">
        <meta name="twitter:description" content="Sube tu CV y recibe una puntuación tipo ATS, feedback accionable por secciones y reescrituras de tus puntos más débiles.">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes(nonce: $cspNonce)
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
