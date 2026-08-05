#!/bin/sh
set -e

# For DB_CONNECTION=sqlite (production): the file must exist before
# Laravel's sqlite driver will connect to it.
if [ "$DB_CONNECTION" = "sqlite" ]; then
    touch database/database.sqlite
fi

php artisan migrate --force

exec "$@"
