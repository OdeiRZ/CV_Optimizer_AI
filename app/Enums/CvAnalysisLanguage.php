<?php

namespace App\Enums;

enum CvAnalysisLanguage: string
{
    case Spanish = 'es';
    case English = 'en';

    public function label(): string
    {
        return match ($this) {
            self::Spanish => 'Spanish',
            self::English => 'English',
        };
    }
}
