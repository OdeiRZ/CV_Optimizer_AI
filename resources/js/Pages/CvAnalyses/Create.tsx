import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AnalysisProgress from '@/Components/AnalysisProgress';
import ThemeToggle from '@/Components/ThemeToggle';
import { formatFileSize, formatNumber, useLanguage } from '@/lib/i18n';
import { CvAnalysisLanguage } from '@/types/cv';

interface CreateProps {
    maxUploadKb: number;
    jobDescriptionMax: number;
    dailyLimit: number;
    remainingToday: number;
}

const ACCEPTED_EXTENSIONS = ['pdf', 'docx'];

function fileExtension(name: string): string {
    return name.split('.').pop()?.toLowerCase() ?? '';
}

export default function Create({
    maxUploadKb,
    jobDescriptionMax,
    dailyLimit,
    remainingToday,
}: CreateProps) {
    const { language, setLanguage, t } = useLanguage();
    const maxUploadMb = Math.round(maxUploadKb / 1024);
    const maxUploadBytes = maxUploadKb * 1024;

    const { data, setData, post, processing, progress, errors, setError, clearErrors } =
        useForm<{
            cv: File | null;
            job_description: string;
            language: CvAnalysisLanguage;
        }>({
            cv: null,
            job_description: '',
            language,
        });

    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState(false);
    const [submitError, setSubmitError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sin análisis que gastar, enviar solo subiría el CV entero para que el
    // servidor lo rechace (el límite diario se cuenta en el servidor).
    const quotaExhausted = remainingToday <= 0;
    const jobDescriptionLength = data.job_description.length;
    const jobDescriptionTooLong = jobDescriptionLength > jobDescriptionMax;
    const canSubmit = data.cv !== null && !quotaExhausted && !jobDescriptionTooLong;

    // This Inertia version (2.x, see package.json) has no per-visit
    // onNetworkError option - only a later major adds one. The
    // equivalent here is the global 'exception' event: fired for an
    // actual thrown/network-level failure, as opposed to 'error'
    // (already handled per-submission below via onError, for a normal
    // Inertia response carrying validation errors). Scoped to this
    // page's own mount lifecycle since it's a global listener, not tied
    // to a specific request.
    useEffect(() => {
        return router.on('exception', () => {
            setSubmitError(true);
        });
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setSubmitError(false);

        post(route('cv-analyses.store'), {
            forceFormData: true,
            // Wasn't here before (hallazgo de una auditoría de código):
            // Inertia still reset `processing` to false either way, so
            // on a connection failure (dropped network, timeout during
            // Render's ~50s cold start) the wait screen just vanished
            // back to the empty form with no explanation and no
            // cv/job_description field to blame - the CV itself was
            // never rejected, the request just never made it there
            // (that specific case is the 'exception' listener above).
            // errors.cv/errors.job_description already cover an actual
            // validation failure, so onError only needs to step in when
            // neither of those got set.
            onError: (errors) => {
                if (!errors.cv && !errors.job_description) {
                    setSubmitError(true);
                }
            },
        });
    };

    // Production runs the analysis synchronously inside this same request
    // (QUEUE_CONNECTION=sync), so `processing` stays true for the entire
    // upload-plus-LLM-call duration - warn before an accidental tab close
    // or reload throws that work away.
    useEffect(() => {
        if (!processing) {
            return;
        }

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [processing]);

    const selectLanguage = (next: CvAnalysisLanguage) => {
        setLanguage(next);
        setData('language', next);
    };

    const handleFiles = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }

        // Checked client-side, before the file ever leaves the browser:
        // an oversized upload otherwise gets rejected by PHP's own
        // post_max_size/upload_max_filesize before Laravel's validation
        // ever runs, producing a raw, unstyled error page instead of this
        // form's normal errors.cv message.
        if (file.size > maxUploadBytes) {
            setError('cv', t.fileTooLarge(maxUploadMb));
            setData('cv', null);
            return;
        }

        // El <input accept> solo filtra el selector de archivos: arrastrar
        // cualquier otro tipo se colaba hasta el servidor.
        if (!ACCEPTED_EXTENSIONS.includes(fileExtension(file.name))) {
            setError('cv', t.invalidFileType);
            setData('cv', null);
            return;
        }

        clearErrors('cv');
        setData('cv', file);
    };

    const loadSample = async () => {
        setLoadingSample(true);
        clearErrors('cv');
        try {
            const response = await fetch('/samples/sample-cv.pdf');
            if (!response.ok) {
                throw new Error('sample fetch failed');
            }
            const blob = await response.blob();
            const file = new File([blob], 'sample-cv.pdf', { type: 'application/pdf' });
            setData('cv', file);
        } catch {
            setError('cv', t.sampleLoadError);
        } finally {
            setLoadingSample(false);
        }
    };

    const uploadPercent =
        progress && (progress.percentage ?? 100) < 100 ? (progress.percentage ?? 0) : null;

    return (
        <>
            <Head title={t.headTitleCreate} />

            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
            >
                {t.skipToContent}
            </a>

            <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
                <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/60">
                            {(['es', 'en'] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => selectLanguage(option)}
                                    aria-pressed={language === option}
                                    className={`rounded-md px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
                                        language === option
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {option === 'es' ? 'Español' : 'English'}
                                </button>
                            ))}
                        </div>
                        <ThemeToggle
                            toLightLabel={t.themeToLight}
                            toDarkLabel={t.themeToDark}
                        />
                    </div>

                    <header className="mb-12 text-center">
                        <p className="mb-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {t.badge}
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                            {t.heading}
                        </h1>
                        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
                            {t.subheading}
                        </p>
                        <p className="mt-3 text-xs tabular-nums text-slate-600 dark:text-slate-400">
                            {quotaExhausted
                                ? t.quotaExhausted
                                : t.remainingToday(remainingToday, dailyLimit)}
                        </p>
                    </header>

                    {submitError && (
                        <p
                            role="alert"
                            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                        >
                            {t.submitError}
                        </p>
                    )}

                    {processing ? (
                        <AnalysisProgress
                            analyzingLabel={t.analyzing(data.cv?.name ?? '')}
                            sizeLabel={
                                data.cv ? formatFileSize(data.cv.size, language) : undefined
                            }
                            uploadPercent={uploadPercent}
                            uploadingLabel={t.stepUploading}
                            uploadedLabel={t.stepUploaded}
                            analyzingStepLabel={t.stepAnalyzing}
                            slowNotice={t.slowNotice}
                            closeWarning={t.closeWarning}
                        />
                    ) : (
                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-2xl dark:shadow-black/20"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            tabIndex={-1}
                            aria-hidden="true"
                            className="hidden"
                            onChange={(e) => {
                                handleFiles(e.target.files);
                                // Para poder elegir el mismo archivo otra vez.
                                e.target.value = '';
                            }}
                        />

                        {data.cv ? (
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    handleFiles(e.dataTransfer.files);
                                }}
                                className={`flex items-center gap-4 rounded-xl border px-4 py-4 transition ${
                                    isDragging
                                        ? 'border-emerald-400 bg-emerald-400/5'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40'
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                                >
                                    {fileExtension(data.cv.name) === 'docx' ? 'DOCX' : 'PDF'}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                        {data.cv.name}
                                    </p>
                                    <p className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
                                        {fileExtension(data.cv.name) === 'docx' ? 'DOCX' : 'PDF'} ·{' '}
                                        {formatFileSize(data.cv.size, language)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                                >
                                    {t.changeFile}
                                </button>
                            </div>
                        ) : (
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label={t.dropzoneHint}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    handleFiles(e.dataTransfer.files);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                                    isDragging
                                        ? 'border-emerald-400 bg-emerald-400/5'
                                        : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
                                }`}
                            >
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {t.dropzoneHint}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    {t.dropzoneSubHint(maxUploadMb)}
                                </p>
                            </div>
                        )}
                        {errors.cv && (
                            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                                {errors.cv}
                            </p>
                        )}

                        <div className="mt-3 flex items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={loadSample}
                                disabled={loadingSample}
                                className="rounded text-sm font-medium text-emerald-700 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-slate-900"
                            >
                                {t.trySample}
                            </button>
                            <a
                                href="/samples/sample-cv.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded text-sm font-medium text-slate-600 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-900"
                            >
                                {t.viewSample}
                            </a>
                        </div>

                        <div className="mt-6">
                            <label
                                htmlFor="job_description"
                                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                {t.jobDescriptionLabel}
                            </label>
                            <textarea
                                id="job_description"
                                rows={5}
                                value={data.job_description}
                                onChange={(e) =>
                                    setData('job_description', e.target.value)
                                }
                                placeholder={t.jobDescriptionPlaceholder}
                                aria-describedby="job_description_count"
                                className="w-full rounded-lg border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-400"
                            />
                            <p
                                id="job_description_count"
                                className={`mt-1 text-right text-xs tabular-nums ${
                                    jobDescriptionTooLong
                                        ? 'font-medium text-red-700 dark:text-red-400'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {t.jobDescriptionCount(
                                    formatNumber(jobDescriptionLength, language),
                                    formatNumber(jobDescriptionMax, language),
                                )}
                            </p>
                            {jobDescriptionTooLong && (
                                <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
                                    {t.jobDescriptionTooLong(
                                        formatNumber(jobDescriptionMax, language),
                                    )}
                                </p>
                            )}
                            {errors.job_description && (
                                <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                                    {errors.job_description}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="mt-8 w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-slate-900"
                        >
                            {t.submit}
                        </button>
                    </form>
                    )}

                    <p className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400">
                        {t.privacyNote}
                    </p>

                    <div className="mt-16">
                        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {t.howItWorksHeading}
                        </h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            {t.howItWorksItems.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60"
                                >
                                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
