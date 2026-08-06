import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/lib/i18n';
import { CvAnalysis, CvAnalysisSeverity } from '@/types/cv';

const severityStyles: Record<CvAnalysisSeverity, string> = {
    critico: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
    mejorable:
        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
};

function scoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export default function Show({ analysis: initial }: { analysis: CvAnalysis }) {
    const [analysis, setAnalysis] = useState(initial);
    const { t } = useLanguage(initial.language);

    useEffect(() => {
        if (analysis.status !== 'pending' && analysis.status !== 'processing') {
            return;
        }

        const interval = setInterval(async () => {
            const { data } = await axios.get<CvAnalysis>(
                route('cv-analyses.status', analysis.id),
            );
            setAnalysis(data);
        }, 1500);

        return () => clearInterval(interval);
    }, [analysis.status, analysis.id]);

    return (
        <>
            <Head title={t.headTitleShow} />

            <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
                <div className="mx-auto max-w-3xl px-6 py-16">
                    <div className="mb-8 flex items-center justify-between">
                        <Link
                            href={route('cv-analyses.create')}
                            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            {t.backLink}
                        </Link>
                        <ThemeToggle />
                    </div>

                    {(analysis.status === 'pending' ||
                        analysis.status === 'processing') && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-center dark:border-slate-800 dark:bg-slate-900/60">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500 dark:border-slate-700 dark:border-t-emerald-400" />
                            <p className="mt-6 font-medium text-slate-800 dark:text-slate-200">
                                {t.analyzing(analysis.original_filename)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {t.analyzingSubtext}
                            </p>
                        </div>
                    )}

                    {analysis.status === 'failed' && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
                            <p className="font-medium text-red-700 dark:text-red-300">
                                {analysis.error_message ?? t.genericError}
                            </p>
                            <Link
                                href={route('cv-analyses.create')}
                                className="mt-4 inline-block rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {t.retry}
                            </Link>
                        </div>
                    )}

                    {analysis.status === 'completed' && analysis.result && (
                        <div className="space-y-8">
                            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                                <span
                                    className={`text-6xl font-bold ${scoreColor(analysis.result.score)}`}
                                >
                                    {analysis.result.score}
                                </span>
                                <span className="mt-1 text-sm text-slate-500">
                                    {t.scoreLabel}
                                </span>
                                <p className="mt-4 max-w-xl text-slate-700 dark:text-slate-300">
                                    {analysis.result.summary}
                                </p>
                                <a
                                    href={route('cv-analyses.report', analysis.id)}
                                    className="mt-6 inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                                >
                                    {t.downloadPdf}
                                </a>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    {t.sectionsHeading}
                                </h2>
                                {analysis.result.sections.map((section) => (
                                    <div
                                        key={section.name}
                                        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
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
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                        {t.missingKeywordsHeading}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.result.missing_keywords.map(
                                            (keyword) => (
                                                <span
                                                    key={keyword}
                                                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                >
                                                    {keyword}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            {analysis.result.bullet_rewrites.length > 0 && (
                                <div className="space-y-3">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                        {t.rewritesHeading}
                                    </h2>
                                    {analysis.result.bullet_rewrites.map(
                                        (rewrite, index) => (
                                            <div
                                                key={index}
                                                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                                            >
                                                <p className="text-sm text-slate-500 line-through decoration-red-500/50">
                                                    {rewrite.original}
                                                </p>
                                                <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                                    {rewrite.improved}
                                                </p>
                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-600">
                                                    {rewrite.reason}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
