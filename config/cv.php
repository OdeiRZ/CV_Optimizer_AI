<?php

return [
    'analysis_provider' => env('CV_ANALYSIS_PROVIDER', 'anthropic'),
    'analysis_model' => env('CV_ANALYSIS_MODEL', 'claude-haiku-4-5'),

    'max_upload_kb' => env('CV_MAX_UPLOAD_KB', 5120),
];
