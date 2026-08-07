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

### Documentado

- Se documenta en el README que la puntuación puede variar ligeramente entre distintos
  análisis del mismo CV: es el juicio de un LLM, no una fórmula determinista, y no es
  un bug si dos ejecuciones no coinciden exactamente.

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
