# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), y este
proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

- Informe descargable en PDF del resultado de un análisis completado (puntuación,
  feedback por sección, palabras clave ausentes y puntos reescritos), vía
  `barryvdh/laravel-dompdf`.

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
