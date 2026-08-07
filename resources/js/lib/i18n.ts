import { useState } from 'react';
import { CvAnalysisLanguage } from '@/types/cv';

const STORAGE_KEY = 'cv-optimizer-language';

interface Dictionary {
    headTitleCreate: string;
    badge: string;
    heading: string;
    subheading: string;
    dropzoneHint: string;
    dropzoneSubHint: (maxMb: number) => string;
    fileTooLarge: (maxMb: number) => string;
    trySample: string;
    viewSample: string;
    sampleLoadError: string;
    remainingToday: (remaining: number, limit: number) => string;
    jobDescriptionLabel: string;
    jobDescriptionPlaceholder: string;
    submitting: string;
    submit: string;
    privacyNote: string;

    headTitleShow: string;
    backLink: string;
    analyzing: (filename: string) => string;
    analyzingSubtext: string;
    analyzingWarning: string;
    genericError: string;
    retry: string;
    scoreLabel: string;
    downloadPdf: string;
    copyLink: string;
    linkCopied: string;
    cvPreviewHeading: string;
    cvPreviewUnavailable: string;
    sectionsHeading: string;
    missingKeywordsHeading: string;
    rewritesHeading: string;
    severity: { critico: string; mejorable: string; ok: string };
}

const translations: Record<CvAnalysisLanguage, Dictionary> = {
    es: {
        headTitleCreate: 'Analizador de CV con IA',
        badge: 'Impulsado por IA',
        heading: 'Optimiza tu CV en segundos',
        subheading:
            'Sube tu CV y, opcionalmente, la oferta a la que aspiras. Recibe una puntuación tipo ATS, feedback accionable y reescrituras de tus puntos más débiles.',
        dropzoneHint: 'Arrastra tu CV aquí o haz clic para subirlo',
        dropzoneSubHint: (maxMb) => `PDF o DOCX, máx. ${maxMb} MB`,
        fileTooLarge: (maxMb) =>
            `El archivo supera el límite de ${maxMb} MB. Prueba a exportar el CV como PDF más ligero o reduce su tamaño.`,
        trySample: 'Probar con un CV de ejemplo',
        viewSample: 'Ver el CV de ejemplo',
        sampleLoadError: 'No se ha podido cargar el CV de ejemplo. Inténtalo de nuevo.',
        remainingToday: (remaining, limit) =>
            `Te quedan ${remaining} de ${limit} análisis hoy.`,
        jobDescriptionLabel: 'Oferta de trabajo (opcional)',
        jobDescriptionPlaceholder:
            'Pega aquí la descripción del puesto para recibir un análisis de compatibilidad y palabras clave ausentes.',
        submitting: 'Subiendo...',
        submit: 'Analizar mi CV',
        privacyNote: 'Tu CV se usa únicamente para generar este análisis.',

        headTitleShow: 'Resultado del análisis',
        backLink: '← Analizar otro CV',
        analyzing: (filename) => `Analizando ${filename}...`,
        analyzingSubtext: 'Esto suele tardar unos segundos.',
        analyzingWarning: 'No cierres ni recargues esta pestaña, o perderás el análisis.',
        genericError: 'No se ha podido analizar el CV.',
        retry: 'Volver a intentarlo',
        scoreLabel: 'Puntuación sobre 100',
        downloadPdf: 'Descargar informe (PDF)',
        copyLink: 'Copiar enlace',
        linkCopied: 'Enlace copiado',
        cvPreviewHeading: 'Tu CV',
        cvPreviewUnavailable:
            'La vista previa no está disponible para archivos DOCX, solo para PDF.',
        sectionsHeading: 'Feedback por sección',
        missingKeywordsHeading: 'Palabras clave ausentes',
        rewritesHeading: 'Puntos reescritos',
        severity: { critico: 'Crítico', mejorable: 'Mejorable', ok: 'Correcto' },
    },
    en: {
        headTitleCreate: 'AI CV Analyzer',
        badge: 'Powered by AI',
        heading: 'Optimize your CV in seconds',
        subheading:
            'Upload your CV and, optionally, the job posting you are applying to. Get an ATS-style score, actionable feedback and rewrites of your weakest points.',
        dropzoneHint: 'Drag your CV here or click to upload it',
        dropzoneSubHint: (maxMb) => `PDF or DOCX, max. ${maxMb} MB`,
        fileTooLarge: (maxMb) =>
            `The file exceeds the ${maxMb} MB limit. Try exporting a lighter PDF or reducing its size.`,
        trySample: 'Try with a sample CV',
        viewSample: 'View the sample CV',
        sampleLoadError: 'Could not load the sample CV. Please try again.',
        remainingToday: (remaining, limit) =>
            `You have ${remaining} of ${limit} analyses left today.`,
        jobDescriptionLabel: 'Job posting (optional)',
        jobDescriptionPlaceholder:
            'Paste the job description here to get a compatibility analysis and missing keywords.',
        submitting: 'Uploading...',
        submit: 'Analyze my CV',
        privacyNote: 'Your CV is only used to generate this analysis.',

        headTitleShow: 'Analysis result',
        backLink: '← Analyze another CV',
        analyzing: (filename) => `Analyzing ${filename}...`,
        analyzingSubtext: 'This usually takes a few seconds.',
        analyzingWarning: "Don't close or reload this tab, or you'll lose the analysis.",
        genericError: 'The CV could not be analyzed.',
        retry: 'Try again',
        scoreLabel: 'Score out of 100',
        downloadPdf: 'Download report (PDF)',
        copyLink: 'Copy link',
        linkCopied: 'Link copied',
        cvPreviewHeading: 'Your CV',
        cvPreviewUnavailable: 'Preview is only available for PDF, not DOCX, files.',
        sectionsHeading: 'Feedback by section',
        missingKeywordsHeading: 'Missing keywords',
        rewritesHeading: 'Rewritten bullet points',
        severity: { critico: 'Critical', mejorable: 'Needs work', ok: 'Good' },
    },
};

function readStoredLanguage(): CvAnalysisLanguage {
    if (typeof window === 'undefined') {
        return 'es';
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    return stored === 'en' || stored === 'es' ? stored : 'es';
}

/**
 * `fixedLanguage` pins the hook to a specific language (e.g. the language an
 * already-completed analysis was generated in) instead of reading/writing
 * the visitor's stored preference - used on the results page, since that
 * page displays a fixed past choice rather than letting the user switch it.
 */
export function useLanguage(fixedLanguage?: CvAnalysisLanguage) {
    const [language, setLanguageState] = useState<CvAnalysisLanguage>(
        () => fixedLanguage ?? readStoredLanguage(),
    );

    const setLanguage = (next: CvAnalysisLanguage) => {
        setLanguageState(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
    };

    return { language, setLanguage, t: translations[language] };
}
