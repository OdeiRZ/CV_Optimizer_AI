<?php

namespace App\Models;

use App\Enums\CvAnalysisStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CvAnalysis extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'original_filename',
        'file_path',
        'job_description',
        'status',
        'result',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'status' => CvAnalysisStatus::class,
            'result' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
