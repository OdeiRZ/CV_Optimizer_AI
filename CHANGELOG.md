# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), y este
proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

- Informe descargable en PDF del resultado de un análisis completado (puntuación,
  feedback por sección, palabras clave ausentes y puntos reescritos), vía
  `barryvdh/laravel-dompdf`.
- Soporte de español/inglés: selector de idioma en la página de subida que controla
  tanto la interfaz como el idioma en el que el LLM devuelve el feedback. El idioma
  queda fijado por análisis (columna `language`), así que una URL de resultado
  compartida siempre se renderiza en el idioma en que se generó, independientemente
  del selector del visitante. El informe en PDF respeta el mismo idioma.
- Selector de tema claro/oscuro en las páginas de subida y resultado, con la
  preferencia guardada en el navegador. Oscuro sigue siendo el valor por defecto.
- Botón "Probar con un CV de ejemplo" en la página de subida: carga un CV de muestra
  (ficticio, con debilidades intencionadas) para que se pueda ver el análisis sin
  tener que buscar un CV real a mano. Junto a él, un enlace "Ver el CV de ejemplo"
  abre ese mismo PDF en una pestaña nueva para poder consultarlo antes de usarlo.
- Vista previa del CV original embebida en la página de resultado (solo para PDF,
  vía `<iframe>` al visor nativo del navegador), para poder ver a la vez el feedback
  y el formato real del documento y detectar problemas de maquetación que el
  análisis por texto no puede ver. Los DOCX muestran un aviso de que la vista
  previa no está disponible, en vez de convertirlos a imagen en el servidor.
- Pantalla de espera en la página de subida mientras se sube y analiza el CV, con
  aviso de no cerrar ni recargar la pestaña. En producción (`QUEUE_CONNECTION=sync`)
  el análisis se ejecuta dentro de la misma petición del formulario, así que casi
  todo el tiempo de espera ocurría ahí sin ningún feedback más allá del botón
  deshabilitado; ahora se sustituye el formulario por un spinner con el nombre del
  fichero, y un `beforeunload` avisa si se intenta cerrar la pestaña mientras tanto.
- Reintento automático (1 reintento, 1s de espera) ante fallos transitorios de la
  llamada al LLM: timeout de conexión, 5xx o 429 del proveedor, usando el soporte
  nativo de reintentos HTTP de Prism (`withClientRetry`). No reintenta en errores
  4xx (p. ej. una petición mal formada), que fallarían igual una segunda vez y solo
  duplicarían el coste de la llamada.
- Botón "Copiar enlace" en la página de resultado, para compartir el análisis sin
  tener que seleccionar la URL manualmente.
- Meta tags Open Graph y Twitter Card (título, descripción) en el layout base, para
  que el enlace se vea bien al compartirlo en redes o chats en vez de mostrar solo
  el título "Laravel" o una tarjeta vacía.
- Pase de accesibilidad: la zona de subida de CV pasa de un `<div>` con `onClick` a
  un control real navegable y activable por teclado (`role="button"`, `tabIndex`,
  `Enter`/`Espacio`); los estados de carga y error usan `role="status"`/`role="alert"`
  con `aria-live` para que los lectores de pantalla los anuncien; y todos los
  controles interactivos (botones, enlaces, selector de idioma) tienen un anillo de
  foco visible en vez de depender del estilo por defecto del navegador.
- Indicador de cuota restante ("Te quedan X de 10 análisis hoy") en la página de
  subida, para que el límite diario se conozca de antemano en vez de descubrirse solo
  al toparse con él en el intento 11. Reutiliza la misma clave de caché que el
  limitador (`App\Support\CvAnalysisRateLimiter`), así que el número mostrado es
  siempre el contador real, no una aproximación.
- `.github/dependabot.yml`: PRs semanales de actualización para Composer, npm,
  Docker y GitHub Actions.
- Sección "Cómo funciona el análisis" en la página de subida: tres tarjetas breves
  (formato/ATS, impacto cuantificado, palabras clave) que reflejan los mismos
  criterios que evalúa el prompt del LLM en `AnalyzeCvJob`, para que quien llega a
  la demo entienda qué se va a evaluar antes de subir un CV propio.
- Gauge circular SVG (`ScoreGauge`) para la puntuación en la página de resultado, en
  vez de un número suelto: el arco relleno usa el mismo umbral de color (rojo/ámbar/
  verde) que ya se usaba en el texto.
- Chequeo de accesibilidad en CI (`npm run a11y`, `scripts/a11y-check.mjs`): ejecuta
  axe-core con Puppeteer contra la página de subida y una página de resultado
  completada (sembrada en el propio workflow), y falla el build si hay alguna
  violación. Detectó y llevó a corregir un problema real al introducirlo: ninguna
  de las dos páginas tenía un landmark `<main>`.
- Enlace "Saltar al contenido" al principio de la página de subida y de resultado,
  oculto salvo que reciba foco por teclado: sin él, alguien navegando con teclado
  tenía que tabular por el selector de idioma y el tema en cada visita antes de
  llegar al contenido real.
- Content-Security-Policy (`App\Http\Middleware\AddContentSecurityPolicy`), activa
  en todo entorno salvo `local` (el cliente HMR de Vite necesita un `connect-src`
  abierto a su propio servidor de desarrollo para el websocket de recarga en
  caliente, algo que un nonce no puede eximir). `script-src` usa un nonce por
  petición (`Vite::useCspNonce()`), que además hace que `@vite`, `@viteReactRefresh`
  y `@routes(nonce: ...)` firmen automáticamente sus propias etiquetas generadas;
  solo el script de tema anti-FOUC en `app.blade.php` necesita el nonce a mano.
  `style-src` permite `unsafe-inline` porque el único uso real de estilos en línea es
  el ancho de la barra de progreso de subida, que no puede ejecutar JavaScript.
- Test E2E de humo en CI (`npm run e2e`, `scripts/e2e-smoke.mjs`, reutilizando
  `puppeteer-core` en vez de añadir Playwright como segunda herramienta de
  automatización): sube el CV de ejemplo por el input real, envía el formulario y
  comprueba que aterriza en una página de resultado con un estado reconocible
  (`role="status"`/`role="alert"`), no una página en blanco o un error 500 en crudo.
  No comprueba un análisis completo (CI no tiene `ANTHROPIC_API_KEY` real ni un
  worker de cola consumiendo el job), pero sí valida subida, validación, creación
  del registro y redirect: la parte del flujo que de verdad puede romperse por un
  cambio en el código, no por la disponibilidad de la API externa.
- Lighthouse CI (`npm run lighthouse`, `lighthouserc.json`) contra la página de
  subida y una página de resultado completada, con umbrales por categoría en vez de
  auditorías individuales (más frágiles): accesibilidad, buenas prácticas y SEO
  fallan el build por debajo de 0.9; rendimiento solo avisa (`warn`) por debajo de
  0.5, ya que la puntuación de rendimiento fluctúa según la carga del runner
  compartido de GitHub Actions y no es un buen motivo para bloquear el build.
  (La página de resultado se retiró temporalmente por un 404 intermitente y se
  volvió a añadir al encontrar la causa real — ver el arreglo de concurrencia de
  `php artisan serve` más abajo.)
- Caché de resultado de análisis (`config('cv.result_cache_ttl_minutes')`, 20 min
  por defecto) para no facturar dos veces un reenvío accidental (doble clic, recarga)
  del mismo CV con la misma oferta e idioma por la misma persona. La clave combina
  la misma identidad de visitante que ya usa el limitador de tasa
  (`App\Support\CvAnalysisRateLimiter::key()`) con un hash del texto extraído, la
  oferta y el idioma — nunca solo el contenido — precisamente para que dos personas
  distintas que suban un CV con el mismo texto (p. ej. ambas usando el CV de
  ejemplo sin modificar) no reciban el resultado cacheado la una de la otra.

### Cambiado

- La base de datos de producción pasa de PostgreSQL a SQLite. El plan gratuito de
  Postgres en Render caduca a los 30 días y se borra si no se pasa a un plan de pago;
  SQLite vive en el propio contenedor sin fecha de expiración (a cambio de que el
  historial de análisis y las sesiones se reinicien en cada redeploy, algo aceptable
  para una demo pública).
- Se baja la `temperature` de la llamada al LLM a `0`, el valor más determinista
  disponible, para minimizar la variación de puntuación entre análisis del mismo CV.

### Corregido

- Build de Docker: faltaba `sqlite-dev` para poder compilar la extensión `pdo_sqlite`.
- El límite de 10 análisis diarios devolvía una respuesta 429 en crudo que el frontend
  no sabía renderizar: la subida parecía no hacer nada. Ahora se muestra como un error
  legible reutilizando el mismo hueco de errores de validación del formulario.
- Un fallo durante el análisis (p. ej. un timeout de la API de Anthropic) producía un
  500 en crudo en lugar de la página de resultado con el mensaje de error ya previsto
  para ese caso: en producción (`QUEUE_CONNECTION=sync`) el job se ejecuta dentro de la
  misma petición, y su relanzamiento de la excepción (pensado para que un worker de
  cola real pueda reintentarlo) escapaba de la petición HTTP antes de llegar al
  redirect. Encontrado probando el selector de idioma en vivo.
- El límite de 10 análisis diarios no bloqueaba nunca: 11 peticiones reales seguidas
  en producción se procesaron todas. Render sirve la app detrás de Cloudflare, y con
  `trustProxies(at: '*')` (necesario para que Laravel detecte bien HTTPS) toda la
  cadena de proxies queda marcada como confiable, así que `$request->ip()` no tiene
  ningún salto "no confiable" en el que anclarse y termina devolviendo la IP interna
  del balanceador de Render — que además no es estable entre peticiones, por lo que el
  contador por IP nunca superaba 1 para el mismo visitante. Ahora se usa la cabecera
  `CF-Connecting-IP` de Cloudflare, que sí lleva la IP real del visitante.
- Un CV que superaba el límite de tamaño (probado con un DOCX de 9,7 MB) provocaba un
  413 en crudo de PHP en lugar del mensaje de validación habitual del formulario: el
  límite de Laravel nunca llegaba a comprobarse porque `post_max_size`/
  `upload_max_filesize` de PHP rechazan la petición antes. Ahora se valida el tamaño en
  el propio navegador contra el mismo límite que usa el backend (enviado como prop
  `maxUploadKb`, para que no puedan desincronizarse), así el archivo nunca llega a
  enviarse si es demasiado grande.
- Auditoría manual de responsive en móvil (simulada con un iframe interno, ya que el
  redimensionado real de ventana no funcionaba en el entorno de pruebas): el resto
  del diseño ya era fluido, pero el `<iframe>` de vista previa del CV tenía una
  altura fija de 600px que en una pantalla de móvil típica ocupaba la mayor parte de
  la pantalla antes de llegar al feedback. Ahora es de 380px por debajo del punto de
  corte `sm` y 600px a partir de ahí.
- `php artisan serve` en producción corría con un único worker
  (`PHP_CLI_SERVER_WORKERS=1`, el valor por defecto de Laravel), es decir, una sola
  petición HTTP en vuelo a la vez. Con `QUEUE_CONNECTION=sync`, eso incluye toda la
  duración de la llamada al LLM: mientras un análisis estaba en curso, cualquier otro
  visitante quedaba bloqueado sin poder ni siquiera cargar la portada. Encontrado al
  investigar por qué Lighthouse CI recibía un 404 en una URL que Puppeteer acababa de
  cargar bien segundos antes en el mismo job — la causa real no era el fixture, sino
  esta falta de concurrencia. El Dockerfile ahora fija `PHP_CLI_SERVER_WORKERS=4` y
  añade `--no-reload` (imprescindible para que Laravel respete esa variable). Como
  contrapartida directa de permitir más concurrencia, `config('database.connections.sqlite.busy_timeout')`
  pasa de `null` a 5000 ms (configurable vía `DB_BUSY_TIMEOUT`), para que dos
  escrituras casi simultáneas esperen brevemente al `lock` de SQLite en vez de fallar
  al instante con "database is locked".

### Documentado

- Se documenta en el README que la puntuación puede variar ligeramente entre distintos
  análisis del mismo CV: es el juicio de un LLM, no una fórmula determinista, y no es
  un bug si dos ejecuciones no coinciden exactamente.
- Se documenta como limitación conocida (no como hueco pendiente) la decisión de no
  implementar un historial de análisis para usuarios logueados: el modelo ya soporta
  `user_id`, pero un historial "de verdad" chocaría con el almacenamiento efímero de
  producción (se perdería sin aviso en cada redeploy/reinicio) y con la postura de
  privacidad ya adoptada de no acumular indefinidamente CVs reales de terceros.

## [0.9.0] - 2026-08-05

Primera versión funcional de punta a punta, desplegada en producción.

### Añadido

- Subida de CV (PDF/DOCX, máx. 5 MB) con extracción automática de texto.
- Análisis por IA (Anthropic Claude vía Prism PHP) con salida estructurada:
  puntuación 0-100, resumen, feedback por sección con nivel de severidad.
- Coincidencia opcional contra una oferta de trabajo para detectar palabras clave
  ausentes en el CV.
- Reescritura de las líneas de experiencia más débiles del CV, con justificación de
  cada cambio.
- Límite de 10 análisis al día por usuario/IP, para controlar el coste de una demo
  pública que llama a una API de pago.
- Suite de tests (Pest) con el proveedor LLM mockeado vía el fake de Prism.
- Despliegue en Render (Docker) con CI en GitHub Actions.

### Corregido

- Varias incompatibilidades entre el schema de salida estructurada y el validador de
  Anthropic (`minimum`/`maximum` en campos numéricos y `minItems`/`maxItems` fuera de
  `{0, 1}` en arrays no están soportados).
- Entidades HTML sin decodificar (`&#039;`) filtrándose desde la extracción de texto
  de DOCX hacia el prompt del análisis.
- `TrustProxies` sin configurar causaba URLs de assets en `http://` bajo el proxy TLS
  de Render.
- Nombre de la app por defecto ("Laravel") en el título de la pestaña, por ser
  `VITE_APP_NAME` una variable de build-time no disponible en el entorno de Render.
