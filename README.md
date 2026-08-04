# CV Optimizer AI

Analizador y optimizador de CVs con IA: sube tu currículum (y opcionalmente la oferta de trabajo a la que aspiras) y recibe una puntuación tipo ATS, feedback accionable por secciones y reescrituras concretas de tus puntos más débiles.

## Características

- Subida de CV por drag & drop (PDF o DOCX) con extracción de texto automática.
- Análisis por IA con salida estructurada: puntuación 0-100, resumen, feedback por sección (formato, experiencia, palabras clave) con nivel de severidad.
- Coincidencia opcional contra una oferta de trabajo: detecta palabras clave importantes ausentes en el CV.
- Reescritura de 3 a 5 de las líneas de experiencia más débiles del CV (voz pasiva o sin métricas) a una versión más fuerte.
- Procesamiento asíncrono en cola: el análisis se ejecuta en background y el frontend hace polling del resultado.
- Límite de uso diario por usuario/IP en el endpoint que llama al LLM, para controlar el coste de una demo pública.

## Tecnologías

- Laravel 12 + Inertia.js + React 18 + TypeScript
- Tailwind CSS v4
- [Prism PHP](https://prismphp.com/) para la integración con el LLM (Anthropic Claude por defecto, proveedor intercambiable vía configuración)
- `smalot/pdfparser` y `phpoffice/phpword` para extraer texto de PDF y DOCX
- Pest para los tests (backend mockeando el proveedor LLM con el fake de Prism)
- Docker + GitHub Actions

## Instalación / Cómo ejecutarlo

**Local:**

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate
```

Añade tu clave de Anthropic en `.env`:

```env
ANTHROPIC_API_KEY=tu-clave
```

```bash
touch database/database.sqlite
php artisan migrate

npm run build   # o: npm run dev
php artisan serve
```

En otra terminal, arranca el worker que procesa los análisis:

```bash
php artisan queue:work
```

**Con Docker:**

```bash
cp .env.example .env
php artisan key:generate   # genera APP_KEY localmente antes de levantar los contenedores
docker compose up --build
```

La aplicación queda disponible en `http://localhost:8080`.

## Testing

```bash
php artisan test
```

La suite mockea el proveedor LLM (`Prism::fake()`), por lo que no realiza llamadas reales a la API.

## Seguridad

- El endpoint que dispara el análisis (llamada de pago al LLM) está limitado a 10 peticiones al día por usuario o IP.
- Los CVs subidos se guardan en almacenamiento privado (`storage/app/private`), no accesible públicamente.
- Las credenciales del LLM y de la base de datos se configuran por variables de entorno, nunca en el código.

## Licencia

MIT (ver archivo [LICENSE](LICENSE)).

## Autor

Odei Riveiro — Ingeniero de Software
[LinkedIn](https://www.linkedin.com/in/odei-riveiro) |
[GitHub](https://github.com/OdeiRZ)
