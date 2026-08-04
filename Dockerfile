# syntax=docker/dockerfile:1

# ---- PHP dependencies -------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
# The composer:2 image doesn't have the PHP extensions the app requires
# (gd, pdo_mysql, pdo_pgsql, ...) - those are installed in the final stage
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
FROM php:8.3-cli-alpine AS app

WORKDIR /var/www/html

RUN apk add --no-cache \
        libpng-dev libjpeg-turbo-dev freetype-dev libzip-dev oniguruma-dev postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql pdo_pgsql mbstring bcmath gd zip exif pcntl

COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build
COPY . .

RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER www-data

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["entrypoint.sh"]
CMD php artisan serve --host=0.0.0.0 --port=${PORT}
