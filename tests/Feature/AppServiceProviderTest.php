<?php

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\Log;

it('logs a critical warning when APP_DEBUG is left on in production', function () {
    config(['app.env' => 'production', 'app.debug' => true]);
    Log::spy();

    (new AppServiceProvider(app()))->warnIfDebugModeInProduction();

    Log::shouldHaveReceived('critical')->once();
});

it('does not warn when debug is off, even in production', function () {
    config(['app.env' => 'production', 'app.debug' => false]);
    Log::spy();

    (new AppServiceProvider(app()))->warnIfDebugModeInProduction();

    Log::shouldNotHaveReceived('critical');
});

it('does not warn about debug mode outside production', function () {
    config(['app.env' => 'local', 'app.debug' => true]);
    Log::spy();

    (new AppServiceProvider(app()))->warnIfDebugModeInProduction();

    Log::shouldNotHaveReceived('critical');
});
