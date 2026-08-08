# CV Optimizer AI

[![Tests](https://github.com/OdeiRZ/CV_Optimizer_AI/actions/workflows/tests.yml/badge.svg)](https://github.com/OdeiRZ/CV_Optimizer_AI/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/release/OdeiRZ/CV_Optimizer_AI)](https://github.com/OdeiRZ/CV_Optimizer_AI/releases)

Analizador y optimizador de CVs con IA: sube tu currículum (y opcionalmente la oferta de trabajo a la que aspiras) y recibe una puntuación tipo ATS, feedback accionable por secciones y reescrituras concretas de tus puntos más débiles.

**Demo en vivo:** [cv-optimizer-ai-gedo.onrender.com](https://cv-optimizer-ai-gedo.onrender.com)

> El servicio está en el plan gratuito de Render: si lleva un rato inactivo, la primera petición puede tardar ~50s en despertar el contenedor.

## Características

- Subida de CV por drag & drop (PDF o DOCX, máx. 5 MB, validado en el propio navegador antes de enviarlo) con extracción de texto automática. Botón "Probar con un CV de ejemplo" para quien quiera ver el resultado sin subir un CV propio, y enlace para ver ese mismo CV de ejemplo antes de usarlo.
- Análisis por IA con salida estructurada: puntuación 0-100 (mostrada como gauge circular con color según el rango), resumen, feedback por sección (formato, experiencia, palabras clave) con nivel de severidad.
- Coincidencia opcional contra una oferta de trabajo: detecta palabras clave importantes ausentes en el CV.
- Reescritura de las líneas de experiencia más débiles del CV (voz pasiva o sin métricas) a una versión más fuerte, con justificación de cada cambio.
- Informe descargable en PDF con el resultado completo del análisis.
- Vista previa embebida del CV original (solo PDF) en la página de resultado, para poder comparar el feedback con el formato real del documento; con una altura menor en pantallas pequeñas para no ocupar toda la vista en móvil.
- Funciona con CVs en cualquier idioma (probado en español e inglés); interfaz y feedback disponibles en español o inglés (selector en la página de subida).
- Selector de tema claro/oscuro (oscuro por defecto), con la preferencia guardada en el navegador.
- Procesamiento síncrono en producción (`QUEUE_CONNECTION=sync`) para no depender de un worker persistente en hosting gratuito; procesamiento asíncrono en cola con polling en desarrollo local (`QUEUE_CONNECTION=database`).
- Límite de uso diario por usuario/IP en el endpoint que llama al LLM, para controlar el coste de una demo pública. La página de subida muestra cuántos análisis quedan disponibles hoy, en vez de que el límite se descubra solo al toparse con él.
- Pantalla de espera durante la subida y el análisis (con aviso de no cerrar la pestaña), ya que en producción el análisis se ejecuta dentro de la misma petición y puede tardar varios segundos.
- Reintento automático (con backoff) ante fallos transitorios de la API del LLM: timeouts de conexión, 5xx o 429, sin reintentar en errores 4xx que fallarían igual dos veces.
- Caché de resultado (20 min) para no facturar dos veces un reenvío accidental del mismo CV y oferta por la misma persona (doble clic, recarga). Ver [Seguridad](#seguridad) para cómo evita que ese caché mezcle resultados entre visitantes distintos.
- Botón "Copiar enlace" en la página de resultado para compartir el análisis fácilmente.
- Meta tags Open Graph / Twitter Card para que el enlace se vea bien al compartirlo (LinkedIn, Slack, etc.).
- Accesibilidad: la zona de subida es navegable y activable por teclado, los estados de carga y error se anuncian a lectores de pantalla (`role="status"`/`role="alert"`), todos los controles interactivos tienen un foco visible, el contenido principal de cada página vive en un landmark `<main>`, y un enlace "Saltar al contenido" (visible solo al recibir foco) evita tener que tabular por el selector de idioma y el tema en cada visita.
- Sección "Cómo funciona el análisis" en la página de subida, explicando en tres puntos los mismos criterios que evalúa realmente el prompt del LLM (formato/ATS, impacto cuantificado, palabras clave), para generar confianza antes de subir un CV propio.

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
vendor/bin/pint --test   # estilo de código PHP (Laravel Pint), sin escribir cambios
npm run lint             # estilo de código TS/React (ESLint)
```

La suite mockea el proveedor LLM (`Prism::fake()`), por lo que no realiza llamadas reales a la API.

## Despliegue

La demo en vivo corre en el plan gratuito de [Render](https://render.com) mediante el `Dockerfile` incluido (build multi-stage: `composer:2` → `node:20-alpine` → `php:8.3-cli-alpine`, sirviendo con `php artisan serve` en vez de php-fpm + nginx para mantenerlo en un único contenedor). Notas si quieres replicar el despliegue:

- El tier gratuito de Render no soporta *Background Workers*, así que producción usa `QUEUE_CONNECTION=sync` (el análisis se ejecuta en el propio request, sin cola) en vez del `database` + `queue:work` de desarrollo.
- `php artisan serve` usa un único worker por defecto (`PHP_CLI_SERVER_WORKERS=1`), es decir, una sola petición HTTP en vuelo a la vez. Combinado con `QUEUE_CONNECTION=sync`, eso significaba que mientras se procesaba un análisis (varios segundos, más con los reintentos) **todo el sitio quedaba bloqueado** para cualquier otro visitante, incluso para cargar la portada. El Dockerfile fija `PHP_CLI_SERVER_WORKERS=4` y añade `--no-reload` (imprescindible para que Laravel respete esa variable) para permitir varias peticiones simultáneas.
- Esa misma concurrencia añadida hace más probable que dos peticiones escriban en SQLite casi a la vez; `DB_BUSY_TIMEOUT` (por defecto 5000 ms, en `config/database.php`) hace que una escritura espere brevemente al `lock` en vez de fallar al instante con "database is locked".
- Producción usa `DB_CONNECTION=sqlite` en lugar de un Postgres/MySQL gestionado: el Postgres gratuito de Render caduca a los 30 días y se borra si no se pasa a un plan de pago, mientras que SQLite vive en el propio contenedor sin fecha de expiración. El `entrypoint.sh` crea el fichero `database.sqlite` si no existe antes de migrar. Contrapartida: al ser el filesystem del contenedor efímero, el histórico de análisis y las sesiones se reinician en cada redeploy o reinicio — aceptable para una demo pública (y mejor para la privacidad, al no acumular indefinidamente los CVs subidos por terceros).
- Como Render termina TLS en su proxy y reenvía por HTTP plano al contenedor, es imprescindible `$middleware->trustProxies(at: '*')` en `bootstrap/app.php`; sin esto, Laravel genera URLs de assets en `http://` bajo una página `https://` y el navegador las bloquea.
- Esa misma confianza total en los proxies (`at: '*'`) tiene una contrapartida: la app corre detrás de Cloudflare además del proxy interno de Render, y con todos los saltos marcados como confiables, `$request->ip()` deja de identificar al visitante real y devuelve la IP interna del balanceador de Render (que ni siquiera es estable entre peticiones). Esto invalidaba en silencio el límite diario por IP — 11 peticiones reales seguidas se procesaron sin bloquear ninguna antes de detectarlo. La cabecera `CF-Connecting-IP` de Cloudflare sí lleva la IP real del visitante, así que el limitador la usa como fuente primaria (ver `App\Providers\AppServiceProvider`).
- `LOG_CHANNEL=stderr` para que las excepciones aparezcan en el visor de logs de Render (que solo captura stdout/stderr, no ficheros).
- GitHub Actions (`.github/workflows/tests.yml`) comprueba el estilo de código con Laravel Pint (`vendor/bin/pint --test`) antes de la suite de tests y con ESLint (`npm run lint`, tipado + reglas de React/hooks/accesibilidad vía `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y`) antes del build del frontend, ejecuta la suite completa en cada push a `main`, y a continuación un chequeo de accesibilidad con axe-core (`npm run a11y`, sobre la página de subida y una página de resultado completada), un test E2E de humo (`npm run e2e`, subida → página de resultado) y Lighthouse CI (`npm run lighthouse`: rendimiento, accesibilidad, buenas prácticas y SEO, solo sobre la página de subida — ver nota en el CHANGELOG), usando el Chrome ya instalado en el runner (sin descargar Chromium propio).
- Dependabot (`.github/dependabot.yml`) abre PRs semanales de actualización para Composer, npm, Docker y GitHub Actions. La rama `main` exige que el check `test` pase antes de fusionar cualquier PR (incluidas las de Dependabot) y bloquea el borrado o el force-push, salvo bypass explícito de administrador.

## Seguridad

- Content-Security-Policy en producción (no en `local`, para no romper el HMR de Vite): `script-src` restringido a `'self'` más un nonce por petición que cubre tanto el script de tema anti-FOUC como las etiquetas que genera Vite/Ziggy; sin `unsafe-inline` para scripts. `style-src` sí permite `unsafe-inline` (solo se usa para el ancho de la barra de progreso, que no puede ejecutar JS) además de `fonts.bunny.net`.
- El endpoint que dispara el análisis (llamada de pago al LLM) está limitado a 10 peticiones al día por usuario o IP (identificando la IP real vía Cloudflare, no vía `$request->ip()` — ver [Despliegue](#despliegue)).
- Los CVs subidos se guardan en almacenamiento privado (`storage/app/private`), no accesible directamente por URL de disco: tanto la descarga del informe como la vista previa del PDF pasan por rutas de la aplicación cuyo único control de acceso es el identificador ULID del análisis (igual que la propia página de resultado), no hay listados ni URLs predecibles.
- La clave de la API del LLM se configura por variable de entorno, nunca en el código.
- El schema de salida estructurada que se envía a Anthropic evita restricciones no soportadas por su validador (p. ej. `minimum`/`maximum` en campos numéricos, `minItems`/`maxItems` fuera de `{0, 1}` en arrays) para que el análisis nunca falle por un detalle de formato del proveedor.
- La caché de resultados (ver Características) se clava por la misma identidad de visitante que usa el limitador de tasa (usuario o IP vía Cloudflare), no solo por el contenido del CV: dos personas distintas que suban un CV con el mismo texto (p. ej. ambas usando el CV de ejemplo sin modificar) nunca reciben el resultado cacheado la una de la otra, solo el mismo visitante reenviando lo mismo.

## Limitaciones conocidas

- **Sin historial de análisis para usuarios logueados, a propósito.** El modelo ya
  guarda `user_id` cuando hay sesión (se usa para el límite diario) y añadir un
  listado "Mis análisis" sería trivial en sí mismo, pero se ha descartado
  conscientemente por ahora, no por olvido:
  - **Chocaría con el almacenamiento efímero de producción.** Como se explica en
    [Despliegue](#despliegue), el filesystem de Render se reinicia en cada redeploy
    y en cada reinicio manual, así que un historial "de verdad" desaparecería sin
    aviso en cualquier momento — peor experiencia que no ofrecer historial en
    absoluto, porque promete persistencia y la rompe en silencio.
  - **Chocaría con la postura de privacidad ya documentada en [Seguridad](#seguridad).**
    Ahora mismo el proyecto trata como una ventaja no acumular indefinidamente CVs
    reales de terceros; un historial persistente exigiría lo contrario (retención a
    largo plazo, y probablemente una función de borrado propia), lo cual es un
    cambio de postura, no solo una pantalla nueva.

  Implementarlo "de verdad" implicaría aceptar disco/base de datos persistente de
  pago en Render — descartado antes precisamente por el coste y la caducidad a 30
  días del Postgres gratuito — o documentar el historial como "mejor esfuerzo, puede
  perderse en cualquier momento", que resulta una experiencia decepcionante para una
  pieza de portfolio. Se deja documentado aquí como decisión consciente, no como
  hueco pendiente.

- **Lighthouse CI no cubre la página de resultado, por un 404 intermitente no
  achacable a esta aplicación.** Al añadir esa URL a `lighthouserc.json`, el Chrome
  de Lighthouse recibía "Status code: 404" en `/cv-analyses/{id}`, pese a que la
  fila existía (reconfirmada justo antes) y esa misma URL cargaba bien segundos
  antes en el mismo job vía Puppeteer (el chequeo de accesibilidad). Investigado con
  instrumentación real, no solo hipótesis: un `Route::fallback` que registraba
  cualquier petición no reconocida por el router, un listener que registraba
  cualquier `ModelNotFoundException`, y el propio log de acceso del servidor de
  desarrollo de PHP. Resultado: el servidor recibió la petición de Lighthouse **tres
  veces** (su propio reintento automático), respondió en ~0.09 ms cada vez — igual
  de rápido que cualquier petición exitosa — y ni el `fallback` ni el listener de
  excepciones se dispararon nunca. La aplicación nunca vio ni generó un 404 para esa
  URL. Se probó también la hipótesis de que `php artisan serve` con un único worker
  (ver más abajo) causara la caída de alguna petición por falta de concurrencia:
  corregido igualmente (es un problema real de producción), pero el 404 en
  Lighthouse persistió exactamente igual con 4 workers. La causa real está en algo
  específico de cómo el propio Lighthouse/`chrome-launcher` interpreta la respuesta
  en este entorno de CI, no en esta aplicación. Se documenta como limitación
  conocida, respaldada por evidencia, en vez de forzar más ciclos de CI a ciegas; el
  chequeo se queda limitado a la página de subida, que es la que ve todo visitante.

## Changelog

Historial de cambios en [CHANGELOG.md](CHANGELOG.md).

## Licencia

MIT (ver archivo [LICENSE](LICENSE)).

## Autor

Odei Riveiro — Ingeniero de Software
[LinkedIn](https://www.linkedin.com/in/odei-riveiro) |
[GitHub](https://github.com/OdeiRZ)
