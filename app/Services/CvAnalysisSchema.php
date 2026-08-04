<?php

namespace App\Services;

use Prism\Prism\Schema\ArraySchema;
use Prism\Prism\Schema\EnumSchema;
use Prism\Prism\Schema\NumberSchema;
use Prism\Prism\Schema\ObjectSchema;
use Prism\Prism\Schema\StringSchema;

class CvAnalysisSchema
{
    public static function make(): ObjectSchema
    {
        $section = new ObjectSchema(
            name: 'section',
            description: 'Feedback on one aspect of the CV.',
            properties: [
                new StringSchema('name', 'Short name of the section being reviewed, e.g. Formato, Experiencia, Palabras clave.'),
                new EnumSchema('severity', 'How important this feedback is.', ['critico', 'mejorable', 'ok']),
                new StringSchema('feedback', 'One or two sentences of concrete feedback, written in Spanish.'),
            ],
            requiredFields: ['name', 'severity', 'feedback'],
        );

        $bulletRewrite = new ObjectSchema(
            name: 'bullet_rewrite',
            description: 'A weak bullet point from the CV rewritten to be stronger.',
            properties: [
                new StringSchema('original', 'The original bullet point text, copied verbatim from the CV.'),
                new StringSchema('improved', 'A rewritten, stronger version: active voice, quantified impact where possible.'),
                new StringSchema('reason', 'One short sentence explaining what was weak about the original, in Spanish.'),
            ],
            requiredFields: ['original', 'improved', 'reason'],
        );

        return new ObjectSchema(
            name: 'cv_analysis',
            description: 'Structured analysis of a CV, optionally matched against a target job description.',
            properties: [
                new NumberSchema('score', 'Overall CV quality / ATS-compatibility score from 0 to 100.', minimum: 0, maximum: 100),
                new StringSchema('summary', 'A two to three sentence overall assessment of the CV, in Spanish.'),
                new ArraySchema('sections', 'Feedback broken down by section/aspect.', items: $section, minItems: 3, maxItems: 6),
                new ArraySchema(
                    'missing_keywords',
                    'Important keywords/skills from the job description that are missing from the CV. Empty array if no job description was provided.',
                    items: new StringSchema('keyword', 'A missing keyword or skill.'),
                ),
                new ArraySchema('bullet_rewrites', 'Rewritten versions of the 3 to 5 weakest bullet points found in the CV.', items: $bulletRewrite, minItems: 0, maxItems: 5),
            ],
            requiredFields: ['score', 'summary', 'sections', 'missing_keywords', 'bullet_rewrites'],
        );
    }
}
