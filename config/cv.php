<?php

return [
    'analysis_provider' => env('CV_ANALYSIS_PROVIDER', 'anthropic'),
    'analysis_model' => env('CV_ANALYSIS_MODEL', 'claude-haiku-4-5'),

    'max_upload_kb' => env('CV_MAX_UPLOAD_KB', 5120),

    'daily_analysis_limit' => env('CV_DAILY_ANALYSIS_LIMIT', 10),

    // How long an identical (same visitor, same CV text, same job posting,
    // same language) analysis result is reused instead of billing another
    // LLM call - just long enough to absorb an accidental double-submit or
    // retry, not a real history feature (see README's "Limitaciones conocidas").
    'result_cache_ttl_minutes' => env('CV_RESULT_CACHE_TTL_MINUTES', 20),
];
