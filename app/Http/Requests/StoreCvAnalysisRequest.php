<?php

namespace App\Http\Requests;

use App\Enums\CvAnalysisLanguage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreCvAnalysisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cv' => [
                'required',
                'file',
                'mimes:pdf,docx',
                'max:'.config('cv.max_upload_kb'),
            ],
            'job_description' => ['nullable', 'string', 'max:10000'],
            'language' => ['nullable', new Enum(CvAnalysisLanguage::class)],
        ];
    }
}
