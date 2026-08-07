import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/lib/i18n';
import { CvAnalysisLanguage } from '@/types/cv';

interface CreateProps {
    maxUploadKb: number;
    dailyLimit: number;
    remainingToday: number;
}

export default function Create({ maxUploadKb, dailyLimit, remainingToday }: CreateProps) {
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('cv-analyses.store'), { forceFormData: true });
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

    return (
        <>
            <Head title={t.headTitleCreate} />

            <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
                <div className="mx-auto max-w-3xl px-6 py-16">
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
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {option === 'es' ? 'Español' : 'English'}
                                </button>
                            ))}
                        </div>
                        <ThemeToggle />
                    </div>

                    <header className="mb-12 text-center">
                        <p className="mb-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {t.badge}
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                            {t.heading}
                        </h1>
                        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
                            {t.subheading}
                        </p>
                        <p className="mt-3 text-xs text-slate-400 dark:text-slate-600">
                            {t.remainingToday(remainingToday, dailyLimit)}
                        </p>
                    </header>

                    {processing ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 py-24 text-center shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-2xl dark:shadow-black/20"
                        >
                            <div
                                aria-hidden="true"
                                className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500 dark:border-slate-700 dark:border-t-emerald-400"
                            />
                            <p className="mt-6 font-medium text-slate-800 dark:text-slate-200">
                                {progress && (progress.percentage ?? 100) < 100
                                    ? t.submitting
                                    : t.analyzing(data.cv?.name ?? '')}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {t.analyzingSubtext}
                            </p>
                            {progress && (progress.percentage ?? 100) < 100 && (
                                <div className="mt-4 h-2 w-56 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                    <div
                                        className="h-full bg-emerald-500 transition-all"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            )}
                            <p className="mt-6 text-xs font-medium text-amber-600 dark:text-amber-400">
                                {t.analyzingWarning}
                            </p>
                        </div>
                    ) : (
                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-2xl dark:shadow-black/20"
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label={data.cv ? data.cv.name : t.dropzoneHint}
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx"
                                tabIndex={-1}
                                aria-hidden="true"
                                className="hidden"
                                onChange={(e) => handleFiles(e.target.files)}
                            />

                            {data.cv ? (
                                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {data.cv.name}
                                </p>
                            ) : (
                                <>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {t.dropzoneHint}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t.dropzoneSubHint(maxUploadMb)}
                                    </p>
                                </>
                            )}
                        </div>
                        {errors.cv && (
                            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.cv}
                            </p>
                        )}

                        <div className="mt-3 flex items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={loadSample}
                                disabled={loadingSample}
                                className="rounded text-sm font-medium text-emerald-600 hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-slate-900"
                            >
                                {t.trySample}
                            </button>
                            <a
                                href="/samples/sample-cv.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded text-sm font-medium text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-900"
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
                                className="w-full rounded-lg border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-600"
                            />
                            {errors.job_description && (
                                <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    {errors.job_description}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!data.cv}
                            className="mt-8 w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-slate-900"
                        >
                            {t.submit}
                        </button>
                    </form>
                    )}

                    <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-600">
                        {t.privacyNote}
                    </p>

                    <div className="mt-16">
                        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
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
                </div>
            </div>
        </>
    );
}
