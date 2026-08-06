<?php

namespace App\Models;

use App\Enums\CvAnalysisLanguage;
use App\Enums\CvAnalysisStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CvAnalysis extends Model
{
    use HasUlids;

    // Matches the migration's DB-level default; set here too so a freshly
    // created-but-not-refreshed instance (e.g. passed straight into a job)
    // sees the same value without a round-trip to the database.
    protected $attributes = [
        'language' => 'es',
    ];

    protected $fillable = [
        'user_id',
        'original_filename',
        'file_path',
        'job_description',
        'language',
        'status',
        'result',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'status' => CvAnalysisStatus::class,
            'language' => CvAnalysisLanguage::class,
            'result' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
