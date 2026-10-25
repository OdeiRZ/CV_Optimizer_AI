<?php

namespace App\Http\Requests;

use App\Enums\CvAnalysisLanguage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreCvAnalysisRequest extends FormRequest
{
    /** Lo que el servidor corta en la oferta; el formulario enseña el mismo número en su contador. */
    public const JOB_DESCRIPTION_MAX = 10000;

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
            'job_description' => ['nullable', 'string', 'max:'.self::JOB_DESCRIPTION_MAX],
            'language' => ['nullable', new Enum(CvAnalysisLanguage::class)],
        ];
    }

    /**
     * En el idioma que el usuario ha elegido en el formulario (el campo
     * `language`), no en el de Laravel: la app no tiene carpeta `lang/` y
     * los errores salían siempre en inglés ("The cv field is required.")
     * aunque la página estuviera en español.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxMb = (int) round(config('cv.max_upload_kb') / 1024);
        $maxChars = number_format(self::JOB_DESCRIPTION_MAX, 0, ',', '.');

        if ($this->input('language') === CvAnalysisLanguage::English->value) {
            return [
                'cv.required' => 'Choose a CV to analyze.',
                'cv.file' => 'The CV must be a file.',
                'cv.uploaded' => "The file could not be uploaded. It may exceed the {$maxMb} MB limit.",
                'cv.mimes' => 'The CV must be a PDF or DOCX file.',
                'cv.max' => "The file exceeds the {$maxMb} MB limit.",
                'job_description.max' => 'The job posting is too long: the limit is '.number_format(self::JOB_DESCRIPTION_MAX).' characters.',
                'job_description.string' => 'The job posting must be text.',
                'language.enum' => 'The language is not valid.',
            ];
        }

        return [
            'cv.required' => 'Elige un CV para analizar.',
            'cv.file' => 'El CV debe ser un archivo.',
            'cv.uploaded' => "No se ha podido subir el archivo. Puede que supere el límite de {$maxMb} MB.",
            'cv.mimes' => 'El CV debe ser un archivo PDF o DOCX.',
            'cv.max' => "El archivo supera el límite de {$maxMb} MB.",
            'job_description.max' => "La oferta es demasiado larga: el límite es de {$maxChars} caracteres.",
            'job_description.string' => 'La oferta debe ser texto.',
            'language.enum' => 'El idioma no es válido.',
        ];
    }
}
