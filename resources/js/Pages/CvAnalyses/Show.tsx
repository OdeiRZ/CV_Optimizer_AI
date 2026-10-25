import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import AnalysisProgress from '@/Components/AnalysisProgress';
import CopyButton from '@/Components/CopyButton';
import ScoreGauge from '@/Components/ScoreGauge';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/lib/i18n';
import { severityIcon, severityOrder, severityStyles } from '@/lib/severity';
import { CvAnalysis, CvAnalysisSeverity } from '@/types/cv';

const severities: CvAnalysisSeverity[] = ['critico', 'mejorable', 'ok'];

const headingClass =
    'text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400';

export default function Show({ analysis: initial }: { analysis: CvAnalysis }) {
    const [analysis, setAnalysis] = useState(initial);
    const { t } = useLanguage(initial.language);
    const [pollError, setPollError] = useState(false);
    const consecutiveFailures = useRef(0);

    // Lo que más pesa, primero. Se ordena aquí y no se toca lo guardado:
    // el informe en PDF aplica el mismo orden por su lado.
    const sections = useMemo(
        () =>
            [...(analysis.result?.sections ?? [])].sort(
                (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
            ),
        [analysis.result],
    );

    useEffect(() => {
        if (pollError) {
            return;
        }

        if (analysis.status !== 'pending' && analysis.status !== 'processing') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const { data } = await axios.get<CvAnalysis>(
                    route('cv-analyses.status', analysis.id),
                );
                consecutiveFailures.current = 0;
                setAnalysis(data);
            } catch {
                consecutiveFailures.current += 1;

                // A single blip (brief network hiccup) shouldn't
                // interrupt the wait screen - only stop polling and let
                // the user know (hallazgo de una auditoría de código: sin
                // esto, un fallo de red aquí se quedaba sin capturar y el
                // usuario veía el spinner para siempre, sin aviso ni
                // forma de reintentar) once a handful of failures keep
                // happening in a row.
                if (consecutiveFailures.current >= 3) {
                    setPollError(true);
                }
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [analysis.status, analysis.id, pollError]);

    function retryStatusCheck() {
        consecutiveFailures.current = 0;
        setPollError(false);
    }

    return (
        <>
            <Head title={t.headTitleShow} />

            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
            >
                {t.skipToContent}
            </a>

            <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
                <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
                    <div className="mb-8 flex items-center justify-between">
                        <Link
                            href={route('cv-analyses.create')}
                            className="rounded text-sm text-slate-600 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-950"
                        >
                            {t.backLink}
                        </Link>
                        <ThemeToggle
                            toLightLabel={t.themeToLight}
                            toDarkLabel={t.themeToDark}
                        />
                    </div>

                    {/* La página no tenía ningún título de nivel 1 (axe: page-has-heading-one):
                    el de la pestaña no cuenta para un lector de pantalla. */}
                    <h1 className="sr-only">
                        {t.headTitleShow} · {analysis.original_filename}
                    </h1>

                    {(analysis.status === 'pending' ||
                        analysis.status === 'processing') &&
                        !pollError && (
                            <AnalysisProgress
                                analyzingLabel={t.analyzing(analysis.original_filename)}
                                uploadPercent={null}
                                uploadingLabel={t.stepUploading}
                                uploadedLabel={t.stepUploaded}
                                analyzingStepLabel={t.stepAnalyzing}
                                slowNotice={t.slowNotice}
                                closeWarning={t.closeWarning}
                            />
                        )}

                    {pollError && (
                        <div
                            role="alert"
                            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30"
                        >
                            <p className="font-medium text-red-700 dark:text-red-300">
                                {t.statusCheckError}
                            </p>
                            <button
                                type="button"
                                onClick={retryStatusCheck}
                                className="mt-4 inline-block rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-red-950"
                            >
                                {t.retry}
                            </button>
                        </div>
                    )}

                    {analysis.status === 'failed' && (
                        <div
                            role="alert"
                            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30"
                        >
                            <p className="font-medium text-red-700 dark:text-red-300">
                                {analysis.error_message ?? t.genericError}
                            </p>
                            <Link
                                href={route('cv-analyses.create')}
                                className="mt-4 inline-block rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-red-950"
                            >
                                {t.retry}
                            </Link>
                        </div>
                    )}

                    {analysis.status === 'completed' && analysis.result && (
                        <div className="space-y-8">
                            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                                <ScoreGauge
                                    score={analysis.result.score}
                                    label={t.scoreLabel}
                                    rangeLabels={t.scoreRange}
                                />
                                <p className="mt-4 max-w-xl text-slate-700 dark:text-slate-300">
                                    {analysis.result.summary}
                                </p>
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                    <a
                                        href={route('cv-analyses.report', analysis.id)}
                                        className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                                    >
                                        {t.downloadPdf}
                                    </a>
                                    <CopyButton
                                        text={window.location.href}
                                        label={t.copyLink}
                                        copiedLabel={t.linkCopied}
                                        failedLabel={t.copyFailed}
                                        className="px-4 py-2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className={headingClass}>{t.cvPreviewHeading}</h2>
                                {analysis.is_pdf ? (
                                    <iframe
                                        src={route('cv-analyses.file', analysis.id)}
                                        title={t.cvPreviewHeading}
                                        className="h-[380px] w-full rounded-xl border border-slate-200 sm:h-[600px] dark:border-slate-800"
                                    />
                                ) : (
                                    <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                                        {t.cvPreviewUnavailable}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className={headingClass}>{t.sectionsHeading}</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {severities.map((severity) => {
                                            const count = sections.filter(
                                                (section) => section.severity === severity,
                                            ).length;

                                            return count > 0 ? (
                                                <span
                                                    key={severity}
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset ${severityStyles[severity]}`}
                                                >
                                                    {t.sectionCount(severity, count)}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                                {sections.map((section) => (
                                    <div
                                        key={section.name}
                                        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <h3 className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                                                <span
                                                    aria-hidden="true"
                                                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ring-inset ${severityStyles[section.severity]}`}
                                                >
                                                    {severityIcon[section.severity]}
                                                </span>
                                                {section.name}
                                            </h3>
                                            <span
                                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[section.severity]}`}
                                            >
                                                {t.severity[section.severity]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {section.feedback}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {analysis.result.missing_keywords.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className={headingClass}>
                                            {t.missingKeywordsHeading}{' '}
                                            <span className="tabular-nums">
                                                · {analysis.result.missing_keywords.length}
                                            </span>
                                        </h2>
                                        <CopyButton
                                            text={analysis.result.missing_keywords.join(', ')}
                                            label={t.copyList}
                                            copiedLabel={t.copied}
                                            failedLabel={t.copyFailed}
                                        />
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {t.keywordsHint}
                                    </p>
                                    <ul className="flex flex-wrap gap-2">
                                        {analysis.result.missing_keywords.map(
                                            (keyword) => (
                                                <li
                                                    key={keyword}
                                                    className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="mr-1 font-bold text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        +
                                                    </span>
                                                    {keyword}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}

                            {analysis.result.bullet_rewrites.length > 0 && (
                                <div className="space-y-3">
                                    <h2 className={headingClass}>{t.rewritesHeading}</h2>
                                    {analysis.result.bullet_rewrites.map(
                                        (rewrite, index) => (
                                            <div
                                                key={index}
                                                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                                            >
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                            {t.rewriteBefore}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                                            {rewrite.original}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                                            {t.rewriteAfter}
                                                        </p>
                                                        <p className="mt-1 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                                                            {rewrite.improved}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-start justify-between gap-3">
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                        {rewrite.reason}
                                                    </p>
                                                    <CopyButton
                                                        text={rewrite.improved}
                                                        label={t.copy}
                                                        copiedLabel={t.copied}
                                                        failedLabel={t.copyFailed}
                                                        className="shrink-0 !px-2.5 !py-1 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
