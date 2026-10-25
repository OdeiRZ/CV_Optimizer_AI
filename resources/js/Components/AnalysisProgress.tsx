import { useEffect, useState } from 'react';

/** Pasados estos segundos, el aviso de que va más lento de lo normal. */
const SLOW_AFTER_SECONDS = 15;

interface AnalysisProgressProps {
    /** Lo que anuncia el lector de pantalla ("Analizando cv.pdf..."). */
    analyzingLabel: string;
    /** "48,2 KB", si ya se conoce. */
    sizeLabel?: string;
    /** Porcentaje de subida; null si el CV ya está en el servidor. */
    uploadPercent: number | null;
    uploadingLabel: (percent: number) => string;
    uploadedLabel: string;
    analyzingStepLabel: string;
    slowNotice: string;
    closeWarning: string;
}

function formatElapsed(seconds: number): string {
    const minutes = Math.floor(seconds / 60);

    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * El paso "Analizando con IA…" con su contador. Es un componente aparte para
 * que el contador empiece en cero cuando el paso empieza (al montarse), sin
 * reiniciarlo a mano desde un efecto.
 */
function AnalyzingStep({
    label,
    slowNotice,
}: {
    label: string;
    slowNotice: string;
}) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const id = setInterval(() => {
            setSeconds(Math.floor((Date.now() - start) / 1000));
        }, 1000);

        return () => clearInterval(id);
    }, []);

    return (
        <>
            <li className="flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500 motion-reduce:animate-none dark:border-slate-700 dark:border-t-emerald-400"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                    {label}
                    {/* El contador no se anuncia: cambiaría cada segundo. */}
                    <span
                        aria-hidden="true"
                        className="ml-2 font-normal tabular-nums text-slate-600 dark:text-slate-400"
                    >
                        {formatElapsed(seconds)}
                    </span>
                </span>
            </li>
            {seconds >= SLOW_AFTER_SECONDS && (
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    {slowNotice}
                </li>
            )}
        </>
    );
}

/**
 * La espera del análisis en dos pasos reales: el CV subido y el análisis con
 * IA, este con un contador. Si pasa de 15 s sale un aviso de que va más lento
 * de lo normal (un servidor dormido o un análisis largo pueden tardar hasta
 * un minuto, y con el mensaje fijo de antes parecía colgado).
 */
export default function AnalysisProgress({
    analyzingLabel,
    sizeLabel,
    uploadPercent,
    uploadingLabel,
    uploadedLabel,
    analyzingStepLabel,
    slowNotice,
    closeWarning,
}: AnalysisProgressProps) {
    const uploading = uploadPercent !== null && uploadPercent < 100;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={analyzingLabel}
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-2xl dark:shadow-black/20"
        >
            <ol className="mx-auto max-w-sm space-y-4">
                <li className="flex items-center gap-3">
                    {uploading ? (
                        <span
                            aria-hidden="true"
                            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500 motion-reduce:animate-none dark:border-slate-700 dark:border-t-emerald-400"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-slate-950"
                        >
                            ✓
                        </span>
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                        {uploading ? uploadingLabel(uploadPercent) : uploadedLabel}
                        {!uploading && sizeLabel && (
                            <span className="ml-1 font-normal tabular-nums text-slate-600 dark:text-slate-400">
                                · {sizeLabel}
                            </span>
                        )}
                    </span>
                </li>
                {uploading ? (
                    <>
                        <li aria-hidden="true">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${uploadPercent}%` }}
                                />
                            </div>
                        </li>
                        <li className="flex items-center gap-3 opacity-60">
                            <span
                                aria-hidden="true"
                                className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-700"
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                {analyzingStepLabel}
                            </span>
                        </li>
                    </>
                ) : (
                    <AnalyzingStep label={analyzingStepLabel} slowNotice={slowNotice} />
                )}
            </ol>

            <p className="mx-auto mt-6 max-w-sm text-xs text-slate-600 dark:text-slate-400">
                {closeWarning}
            </p>
        </div>
    );
}
