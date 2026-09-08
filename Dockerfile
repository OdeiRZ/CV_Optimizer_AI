# syntax=docker/dockerfile:1

# ---- PHP dependencies -------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
# The composer:2 image doesn't have the PHP extensions the app requires
# (gd, pdo_mysql, pdo_sqlite, ...) - those are installed in the final stage
# below. Skip Composer's platform check here, since it would otherwise
# fail against this intermediate image rather than the real runtime.
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ---- Frontend build -----------------------------------------------------
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime --------------------------------------------------------------
# Single-process container (Laravel's built-in server) so the app can be
# deployed as-is on platforms like Railway/Fly.io, which expect one
# container listening on $PORT rather than a separate nginx + php-fpm pair.
FROM php:8.5-cli-alpine AS app

WORKDIR /var/www/html

RUN apk add --no-cache \
        libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev oniguruma-dev sqlite-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql pdo_sqlite mbstring bcmath gd zip exif pcntl

COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build
COPY . .

RUN chown -R www-data:www-data storage bootstrap/cache database \
    && chmod -R 775 storage bootstrap/cache database

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER www-data

ENV PORT=8080
# php artisan serve defaults to a single worker (PHP_CLI_SERVER_WORKERS=1),
# meaning exactly one HTTP request can be in flight at a time - with
# QUEUE_CONNECTION=sync, that includes the whole duration of an LLM call, so
# a single in-progress analysis would otherwise block every other visitor
# from loading even the homepage. --no-reload is required for Laravel to
# honor PHP_CLI_SERVER_WORKERS at all, and has no downside here since files
# never change at runtime in a built image.
ENV PHP_CLI_SERVER_WORKERS=4
EXPOSE 8080

ENTRYPOINT ["entrypoint.sh"]
CMD php artisan serve --host=0.0.0.0 --port=${PORT} --no-reload
