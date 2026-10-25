import { useEffect, useState } from 'react';
import { CvAnalysisLanguage, CvAnalysisSeverity } from '@/types/cv';

const STORAGE_KEY = 'cv-optimizer-language';

interface Dictionary {
    skipToContent: string;
    themeToLight: string;
    themeToDark: string;

    headTitleCreate: string;
    badge: string;
    heading: string;
    subheading: string;
    dropzoneHint: string;
    dropzoneSubHint: (maxMb: number) => string;
    fileTooLarge: (maxMb: number) => string;
    invalidFileType: string;
    changeFile: string;
    trySample: string;
    viewSample: string;
    sampleLoadError: string;
    submitError: string;
    remainingToday: (remaining: number, limit: number) => string;
    quotaExhausted: string;
    jobDescriptionLabel: string;
    jobDescriptionPlaceholder: string;
    jobDescriptionCount: (count: string, max: string) => string;
    jobDescriptionTooLong: (max: string) => string;
    submitting: string;
    submit: string;
    privacyNote: string;
    howItWorksHeading: string;
    howItWorksItems: { title: string; description: string }[];

    headTitleShow: string;
    backLink: string;
    analyzing: (filename: string) => string;
    stepUploading: (percent: number) => string;
    stepUploaded: string;
    stepAnalyzing: string;
    slowNotice: string;
    closeWarning: string;
    genericError: string;
    retry: string;
    statusCheckError: string;
    scoreLabel: string;
    scoreRange: Record<CvAnalysisSeverity, string>;
    downloadPdf: string;
    copyLink: string;
    linkCopied: string;
    copyFailed: string;
    cvPreviewHeading: string;
    cvPreviewUnavailable: string;
    sectionsHeading: string;
    sectionCount: (severity: CvAnalysisSeverity, count: number) => string;
    missingKeywordsHeading: string;
    keywordsHint: string;
    copyList: string;
    rewritesHeading: string;
    rewriteBefore: string;
    rewriteAfter: string;
    copy: string;
    copied: string;
    severity: Record<CvAnalysisSeverity, string>;
}

const translations: Record<CvAnalysisLanguage, Dictionary> = {
    es: {
        skipToContent: 'Saltar al contenido',
        themeToLight: 'Cambiar al modo claro',
        themeToDark: 'Cambiar al modo oscuro',

        headTitleCreate: 'Analizador de CV con IA',
        badge: 'Impulsado por IA',
        heading: 'Optimiza tu CV en segundos',
        subheading:
            'Sube tu CV y, opcionalmente, la oferta a la que aspiras. Recibe una puntuación tipo ATS, feedback accionable y reescrituras de tus puntos más débiles.',
        dropzoneHint: 'Arrastra tu CV aquí o haz clic para subirlo',
        dropzoneSubHint: (maxMb) => `PDF o DOCX, máx. ${maxMb} MB`,
        fileTooLarge: (maxMb) =>
            `El archivo supera el límite de ${maxMb} MB. Prueba a exportar el CV como PDF más ligero o reduce su tamaño.`,
        invalidFileType: 'El archivo debe ser un PDF o un DOCX.',
        changeFile: 'Cambiar',
        trySample: 'Probar con un CV de ejemplo',
        viewSample: 'Ver el CV de ejemplo',
        sampleLoadError: 'No se ha podido cargar el CV de ejemplo. Inténtalo de nuevo.',
        submitError:
            'No se ha podido enviar el CV. Comprueba tu conexión e inténtalo de nuevo.',
        remainingToday: (remaining, limit) =>
            remaining === 1
                ? `Te queda 1 de ${limit} análisis hoy.`
                : `Te quedan ${remaining} de ${limit} análisis hoy.`,
        quotaExhausted: 'Has agotado los análisis de hoy. Vuelve mañana.',
        jobDescriptionLabel: 'Oferta de trabajo (opcional)',
        jobDescriptionPlaceholder:
            'Pega aquí la descripción del puesto para recibir un análisis de compatibilidad y palabras clave ausentes.',
        jobDescriptionCount: (count, max) => `${count} / ${max}`,
        jobDescriptionTooLong: (max) => `La oferta no puede pasar de ${max} caracteres.`,
        submitting: 'Subiendo...',
        submit: 'Analizar mi CV',
        privacyNote: 'Tu CV se usa únicamente para generar este análisis.',
        howItWorksHeading: 'Cómo funciona el análisis',
        howItWorksItems: [
            {
                title: 'Formato y estructura',
                description:
                    'Revisamos que el diseño sea claro y que un sistema ATS pueda leerlo sin problemas.',
            },
            {
                title: 'Impacto cuantificado',
                description:
                    'Buscamos verbos de acción y resultados medibles, no frases pasivas como "responsable de".',
            },
            {
                title: 'Palabras clave',
                description:
                    'Si añades una oferta de trabajo, comparamos sus requisitos con tu CV para detectar huecos.',
            },
        ],

        headTitleShow: 'Resultado del análisis',
        backLink: '← Analizar otro CV',
        analyzing: (filename) => `Analizando ${filename}...`,
        stepUploading: (percent) => `Subiendo el CV… ${percent} %`,
        stepUploaded: 'CV subido',
        stepAnalyzing: 'Analizando con IA…',
        slowNotice:
            'Está tardando más de lo normal. Algunos análisis llevan hasta un minuto; sigue en marcha.',
        closeWarning: 'Si cierras la pestaña ahora, el análisis se pierde.',
        genericError: 'No se ha podido analizar el CV.',
        retry: 'Volver a intentarlo',
        statusCheckError:
            'No se ha podido comprobar el estado del análisis. Puede que sigas sin conexión.',
        scoreLabel: 'de 100',
        scoreRange: {
            critico: 'Crítico · 0–49',
            mejorable: 'Mejorable · 50–79',
            ok: 'Correcto · 80–100',
        },
        downloadPdf: 'Descargar informe (PDF)',
        copyLink: 'Copiar enlace',
        linkCopied: 'Enlace copiado',
        copyFailed: 'No se ha podido copiar',
        cvPreviewHeading: 'Tu CV',
        cvPreviewUnavailable:
            'La vista previa no está disponible para archivos DOCX, solo para PDF.',
        sectionsHeading: 'Feedback por sección',
        sectionCount: (severity, count) => {
            const one = { critico: 'crítico', mejorable: 'mejorable', ok: 'correcto' }[severity];

            return count === 1 ? `1 ${one}` : `${count} ${one}s`;
        },
        missingKeywordsHeading: 'Palabras clave ausentes',
        keywordsHint:
            'Aparecen en la oferta y no en tu CV. Añade las que de verdad tengas.',
        copyList: 'Copiar lista',
        rewritesHeading: 'Puntos reescritos',
        rewriteBefore: 'Antes',
        rewriteAfter: 'Después',
        copy: 'Copiar',
        copied: 'Copiado',
        severity: { critico: 'Crítico', mejorable: 'Mejorable', ok: 'Correcto' },
    },
    en: {
        skipToContent: 'Skip to content',
        themeToLight: 'Switch to light mode',
        themeToDark: 'Switch to dark mode',

        headTitleCreate: 'AI CV Analyzer',
        badge: 'Powered by AI',
        heading: 'Optimize your CV in seconds',
        subheading:
            'Upload your CV and, optionally, the job posting you are applying to. Get an ATS-style score, actionable feedback and rewrites of your weakest points.',
        dropzoneHint: 'Drag your CV here or click to upload it',
        dropzoneSubHint: (maxMb) => `PDF or DOCX, max. ${maxMb} MB`,
        fileTooLarge: (maxMb) =>
            `The file exceeds the ${maxMb} MB limit. Try exporting a lighter PDF or reducing its size.`,
        invalidFileType: 'The file must be a PDF or a DOCX.',
        changeFile: 'Change',
        trySample: 'Try with a sample CV',
        viewSample: 'View the sample CV',
        sampleLoadError: 'Could not load the sample CV. Please try again.',
        submitError: "Couldn't submit the CV. Check your connection and try again.",
        remainingToday: (remaining, limit) =>
            remaining === 1
                ? `You have 1 of ${limit} analyses left today.`
                : `You have ${remaining} of ${limit} analyses left today.`,
        quotaExhausted: "You've used all of today's analyses. Come back tomorrow.",
        jobDescriptionLabel: 'Job posting (optional)',
        jobDescriptionPlaceholder:
            'Paste the job description here to get a compatibility analysis and missing keywords.',
        jobDescriptionCount: (count, max) => `${count} / ${max}`,
        jobDescriptionTooLong: (max) => `The job posting can't be longer than ${max} characters.`,
        submitting: 'Uploading...',
        submit: 'Analyze my CV',
        privacyNote: 'Your CV is only used to generate this analysis.',
        howItWorksHeading: 'How the analysis works',
        howItWorksItems: [
            {
                title: 'Format & structure',
                description:
                    "We check that the layout is clear and something an ATS can actually parse.",
            },
            {
                title: 'Quantified impact',
                description:
                    'We look for action verbs and measurable results, not passive phrases like "responsible for".',
            },
            {
                title: 'Keywords',
                description:
                    'Add a job posting and we compare its requirements against your CV to spot gaps.',
            },
        ],

        headTitleShow: 'Analysis result',
        backLink: '← Analyze another CV',
        analyzing: (filename) => `Analyzing ${filename}...`,
        stepUploading: (percent) => `Uploading the CV… ${percent}%`,
        stepUploaded: 'CV uploaded',
        stepAnalyzing: 'Analyzing with AI…',
        slowNotice:
            'This is taking longer than usual. Some analyses take up to a minute; it is still running.',
        closeWarning: "If you close the tab now, the analysis is lost.",
        genericError: 'The CV could not be analyzed.',
        retry: 'Try again',
        statusCheckError:
            "Couldn't check the analysis status. You may still be offline.",
        scoreLabel: 'out of 100',
        scoreRange: {
            critico: 'Critical · 0–49',
            mejorable: 'Needs work · 50–79',
            ok: 'Good · 80–100',
        },
        downloadPdf: 'Download report (PDF)',
        copyLink: 'Copy link',
        linkCopied: 'Link copied',
        copyFailed: "Couldn't copy",
        cvPreviewHeading: 'Your CV',
        cvPreviewUnavailable: 'Preview is only available for PDF, not DOCX, files.',
        sectionsHeading: 'Feedback by section',
        sectionCount: (severity, count) => {
            if (severity === 'critico') {
                return `${count} critical`;
            }

            if (severity === 'mejorable') {
                return count === 1 ? '1 needs work' : `${count} need work`;
            }

            return `${count} good`;
        },
        missingKeywordsHeading: 'Missing keywords',
        keywordsHint:
            "They appear in the job posting and not in your CV. Add the ones you really have.",
        copyList: 'Copy list',
        rewritesHeading: 'Rewritten bullet points',
        rewriteBefore: 'Before',
        rewriteAfter: 'After',
        copy: 'Copy',
        copied: 'Copied',
        severity: { critico: 'Critical', mejorable: 'Needs work', ok: 'Good' },
    },
};

function readStoredLanguage(): CvAnalysisLanguage {
    if (typeof window === 'undefined') {
        return 'es';
    }

    // En try/catch: con el almacenamiento bloqueado localStorage lanza, y sin
    // esto la página entera se quedaba en blanco al montar.
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return stored === 'en' || stored === 'es' ? stored : 'es';
    } catch {
        return 'es';
    }
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

    // El atributo lang de la página sigue al idioma que se ve (antes decía
    // "en" aunque la página estuviera en español).
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (next: CvAnalysisLanguage) => {
        setLanguageState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Sin almacenamiento, el idioma vale solo para esta visita.
        }
    };

    return { language, setLanguage, t: translations[language] };
}

/**
 * Cifras en el idioma de la página ("1.240" en español, "1,240" en inglés),
 * siempre con separador de miles: sin `always`, el español deja "1240" y
 * "10.000" en el mismo contador.
 */
export function formatNumber(value: number, language: CvAnalysisLanguage): string {
    return new Intl.NumberFormat(language, {
        useGrouping: 'always',
    } as Intl.NumberFormatOptions).format(value);
}

/** "48,2 KB" / "2,1 MB": una cifra decimal, en el idioma de la página. */
export function formatFileSize(bytes: number, language: CvAnalysisLanguage): string {
    const oneDecimal = new Intl.NumberFormat(language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    return bytes < 1024 * 1024
        ? `${oneDecimal.format(bytes / 1024)} KB`
        : `${oneDecimal.format(bytes / (1024 * 1024))} MB`;
}
