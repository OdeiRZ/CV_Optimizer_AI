# CV Optimizer AI

[![Tests](https://github.com/OdeiRZ/CV_Optimizer_AI/actions/workflows/tests.yml/badge.svg)](https://github.com/OdeiRZ/CV_Optimizer_AI/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/release/OdeiRZ/CV_Optimizer_AI)](https://github.com/OdeiRZ/CV_Optimizer_AI/releases)

Analizador y optimizador de CVs con IA: sube tu currículum (y opcionalmente la oferta de trabajo a la que aspiras) y recibe una puntuación tipo ATS, feedback accionable por secciones y reescrituras concretas de tus puntos más débiles.

**Demo en vivo:** [cv-optimizer-ai-gedo.onrender.com](https://cv-optimizer-ai-gedo.onrender.com)

> El servicio está en el plan gratuito de Render: si lleva un rato inactivo, la primera petición puede tardar ~50s en despertar el contenedor.

## Características

- Subida de CV por drag & drop (PDF o DOCX, máx. 5 MB, validado en el propio navegador antes de enviarlo) con extracción de texto automática. Botón "Probar con un CV de ejemplo" para quien quiera ver el resultado sin subir un CV propio, y enlace para ver ese mismo CV de ejemplo antes de usarlo.
- Análisis por IA con salida estructurada: puntuación 0-100, resumen, feedback por sección (formato, experiencia, palabras clave) con nivel de severidad.
- Coincidencia opcional contra una oferta de trabajo: detecta palabras clave importantes ausentes en el CV.
- Reescritura de las líneas de experiencia más débiles del CV (voz pasiva o sin métricas) a una versión más fuerte, con justificación de cada cambio.
- Informe descargable en PDF con el resultado completo del análisis.
- Vista previa embebida del CV original (solo PDF) en la página de resultado, para poder comparar el feedback con el formato real del documento.
- Funciona con CVs en cualquier idioma (probado en español e inglés); interfaz y feedback disponibles en español o inglés (selector en la página de subida).
- Selector de tema claro/oscuro (oscuro por defecto), con la preferencia guardada en el navegador.
- Procesamiento síncrono en producción (`QUEUE_CONNECTION=sync`) para no depender de un worker persistente en hosting gratuito; procesamiento asíncrono en cola con polling en desarrollo local (`QUEUE_CONNECTION=database`).
- Límite de uso diario por usuario/IP en el endpoint que llama al LLM, para controlar el coste de una demo pública.
- Pantalla de espera durante la subida y el análisis (con aviso de no cerrar la pestaña), ya que en producción el análisis se ejecuta dentro de la misma petición y puede tardar varios segundos.
- Reintento automático (con backoff) ante fallos transitorios de la API del LLM: timeouts de conexión, 5xx o 429, sin reintentar en errores 4xx que fallarían igual dos veces.
- Botón "Copiar enlace" en la página de resultado para compartir el análisis fácilmente.
- Meta tags Open Graph / Twitter Card para que el enlace se vea bien al compartirlo (LinkedIn, Slack, etc.).
- Accesibilidad: la zona de subida es navegable y activable por teclado, los estados de carga y error se anuncian a lectores de pantalla (`role="status"`/`role="alert"`), y todos los controles interactivos tienen un foco visible.

> **Nota sobre la puntuación:** el análisis lo genera un LLM, no una fórmula fija — es un juicio, no un cálculo determinista. Analizar el mismo CV varias veces puede dar puntuaciones ligeramente distintas cada vez. El proyecto llama a la API con `temperature: 0` (la configuración más determinista disponible) para minimizar esa variación, pero no puede eliminarla del todo; no es un bug si dos ejecuciones sobre el mismo CV no coinciden exactamente.

## Tecnologías

- Laravel 12 + Inertia.js + React 18 + TypeScript
- Tailwind CSS v4
- [Prism PHP](https://prismphp.com/) para la integración con el LLM (Anthropic Claude por defecto, proveedor intercambiable vía configuración)
- `smalot/pdfparser` y `phpoffice/phpword` para extraer texto de PDF y DOCX
- `barryvdh/laravel-dompdf` para generar el informe descargable en PDF
- SQLite (desarrollo y producción)
- Pest para los tests (backend mockeando el proveedor LLM con el fake de Prism)
- Docker + GitHub Actions

## Instalación / Cómo ejecutarlo

**Local:**

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

Añade tu clave de Anthropic en `.env` (créala gratis en [platform.claude.com](https://platform.claude.com), sin coste hasta que se realiza una llamada real):

```env
ANTHROPIC_API_KEY=tu-clave
```

Levanta servidor, worker de la cola, logs en tiempo real y Vite a la vez:

```bash
composer run dev
```

O manualmente en terminales separadas si prefieres controlarlas por separado:

```bash
php artisan serve
php artisan queue:work
npm run dev   # o: npm run build, para un build de producción
```

La aplicación queda disponible en `http://localhost:8000`.

**Con Docker:**

```bash
cp .env.example .env
php artisan key:generate   # genera APP_KEY localmente antes de levantar los contenedores
docker compose up --build
```

La aplicación queda disponible en `http://localhost:8080`. `docker-compose.yml` levanta app, worker de cola y base de datos con paridad de dev; no es la imagen usada en producción (ver [Despliegue](#despliegue)).

## Testing

```bash
php artisan test
```

La suite mockea el proveedor LLM (`Prism::fake()`), por lo que no realiza llamadas reales a la API.

## Despliegue

La demo en vivo corre en el plan gratuito de [Render](https://render.com) mediante el `Dockerfile` incluido (build multi-stage: `composer:2` → `node:20-alpine` → `php:8.3-cli-alpine`, sirviendo con `php artisan serve` en vez de php-fpm + nginx para mantenerlo en un único contenedor). Notas si quieres replicar el despliegue:

- El tier gratuito de Render no soporta *Background Workers*, así que producción usa `QUEUE_CONNECTION=sync` (el análisis se ejecuta en el propio request, sin cola) en vez del `database` + `queue:work` de desarrollo.
- Producción usa `DB_CONNECTION=sqlite` en lugar de un Postgres/MySQL gestionado: el Postgres gratuito de Render caduca a los 30 días y se borra si no se pasa a un plan de pago, mientras que SQLite vive en el propio contenedor sin fecha de expiración. El `entrypoint.sh` crea el fichero `database.sqlite` si no existe antes de migrar. Contrapartida: al ser el filesystem del contenedor efímero, el histórico de análisis y las sesiones se reinician en cada redeploy o reinicio — aceptable para una demo pública (y mejor para la privacidad, al no acumular indefinidamente los CVs subidos por terceros).
- Como Render termina TLS en su proxy y reenvía por HTTP plano al contenedor, es imprescindible `$middleware->trustProxies(at: '*')` en `bootstrap/app.php`; sin esto, Laravel genera URLs de assets en `http://` bajo una página `https://` y el navegador las bloquea.
- Esa misma confianza total en los proxies (`at: '*'`) tiene una contrapartida: la app corre detrás de Cloudflare además del proxy interno de Render, y con todos los saltos marcados como confiables, `$request->ip()` deja de identificar al visitante real y devuelve la IP interna del balanceador de Render (que ni siquiera es estable entre peticiones). Esto invalidaba en silencio el límite diario por IP — 11 peticiones reales seguidas se procesaron sin bloquear ninguna antes de detectarlo. La cabecera `CF-Connecting-IP` de Cloudflare sí lleva la IP real del visitante, así que el limitador la usa como fuente primaria (ver `App\Providers\AppServiceProvider`).
- `LOG_CHANNEL=stderr` para que las excepciones aparezcan en el visor de logs de Render (que solo captura stdout/stderr, no ficheros).
- GitHub Actions (`.github/workflows/tests.yml`) ejecuta la suite completa en cada push a `main`.

## Seguridad

- El endpoint que dispara el análisis (llamada de pago al LLM) está limitado a 10 peticiones al día por usuario o IP (identificando la IP real vía Cloudflare, no vía `$request->ip()` — ver [Despliegue](#despliegue)).
- Los CVs subidos se guardan en almacenamiento privado (`storage/app/private`), no accesible directamente por URL de disco: tanto la descarga del informe como la vista previa del PDF pasan por rutas de la aplicación cuyo único control de acceso es el identificador ULID del análisis (igual que la propia página de resultado), no hay listados ni URLs predecibles.
- La clave de la API del LLM se configura por variable de entorno, nunca en el código.
- El schema de salida estructurada que se envía a Anthropic evita restricciones no soportadas por su validador (p. ej. `minimum`/`maximum` en campos numéricos, `minItems`/`maxItems` fuera de `{0, 1}` en arrays) para que el análisis nunca falle por un detalle de formato del proveedor.

## Changelog

Historial de cambios en [CHANGELOG.md](CHANGELOG.md).

## Licencia

MIT (ver archivo [LICENSE](LICENSE)).

## Autor

Odei Riveiro — Ingeniero de Software
[LinkedIn](https://www.linkedin.com/in/odei-riveiro) |
[GitHub](https://github.com/OdeiRZ)
