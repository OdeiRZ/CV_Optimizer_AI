import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { CvAnalysis, CvAnalysisSeverity } from '@/types/cv';

const severityStyles: Record<CvAnalysisSeverity, string> = {
    critico: 'bg-red-500/10 text-red-400 ring-red-500/30',
    mejorable: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
    ok: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
};

const severityLabels: Record<CvAnalysisSeverity, string> = {
    critico: 'Crítico',
    mejorable: 'Mejorable',
    ok: 'Correcto',
};

function scoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
}

export default function Show({ analysis: initial }: { analysis: CvAnalysis }) {
    const [analysis, setAnalysis] = useState(initial);

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
            <Head title="Resultado del análisis" />

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
                <div className="mx-auto max-w-3xl px-6 py-16">
                    <Link
                        href={route('cv-analyses.create')}
                        className="mb-8 inline-block text-sm text-slate-500 hover:text-slate-300"
                    >
                        ← Analizar otro CV
                    </Link>

                    {(analysis.status === 'pending' ||
                        analysis.status === 'processing') && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 py-24 text-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
                            <p className="mt-6 font-medium text-slate-200">
                                Analizando {analysis.original_filename}...
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Esto suele tardar unos segundos.
                            </p>
                        </div>
                    )}

                    {analysis.status === 'failed' && (
                        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-8 text-center">
                            <p className="font-medium text-red-300">
                                {analysis.error_message ??
                                    'No se ha podido analizar el CV.'}
                            </p>
                            <Link
                                href={route('cv-analyses.create')}
                                className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                            >
                                Volver a intentarlo
                            </Link>
                        </div>
                    )}

                    {analysis.status === 'completed' && analysis.result && (
                        <div className="space-y-8">
                            <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                                <span
                                    className={`text-6xl font-bold ${scoreColor(analysis.result.score)}`}
                                >
                                    {analysis.result.score}
                                </span>
                                <span className="mt-1 text-sm text-slate-500">
                                    Puntuación sobre 100
                                </span>
                                <p className="mt-4 max-w-xl text-slate-300">
                                    {analysis.result.summary}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    Feedback por sección
                                </h2>
                                {analysis.result.sections.map((section) => (
                                    <div
                                        key={section.name}
                                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <h3 className="font-medium text-slate-100">
                                                {section.name}
                                            </h3>
                                            <span
                                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[section.severity]}`}
                                            >
                                                {severityLabels[section.severity]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {section.feedback}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {analysis.result.missing_keywords.length > 0 && (
                                <div className="space-y-3">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                        Palabras clave ausentes
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.result.missing_keywords.map(
                                            (keyword) => (
                                                <span
                                                    key={keyword}
                                                    className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300"
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
                                        Puntos reescritos
                                    </h2>
                                    {analysis.result.bullet_rewrites.map(
                                        (rewrite, index) => (
                                            <div
                                                key={index}
                                                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                                            >
                                                <p className="text-sm text-slate-500 line-through decoration-red-500/50">
                                                    {rewrite.original}
                                                </p>
                                                <p className="mt-2 text-sm font-medium text-emerald-300">
                                                    {rewrite.improved}
                                                </p>
                                                <p className="mt-2 text-xs text-slate-600">
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
