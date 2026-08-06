import { FormEventHandler, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/lib/i18n';
import { CvAnalysisLanguage } from '@/types/cv';

export default function Create() {
    const { language, setLanguage, t } = useLanguage();

    const { data, setData, post, processing, progress, errors } = useForm<{
        cv: File | null;
        job_description: string;
        language: CvAnalysisLanguage;
    }>({
        cv: null,
        job_description: '',
        language,
    });

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('cv-analyses.store'), { forceFormData: true });
    };

    const selectLanguage = (next: CvAnalysisLanguage) => {
        setLanguage(next);
        setData('language', next);
    };

    const handleFiles = (files: FileList | null) => {
        const file = files?.[0];
        if (file) {
            setData('cv', file);
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
                                    className={`rounded-md px-3 py-1.5 transition ${
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
                    </header>

                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-2xl dark:shadow-black/20"
                    >
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
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
                                isDragging
                                    ? 'border-emerald-400 bg-emerald-400/5'
                                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx"
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
                                        {t.dropzoneSubHint}
                                    </p>
                                </>
                            )}
                        </div>
                        {errors.cv && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.cv}
                            </p>
                        )}

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
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    {errors.job_description}
                                </p>
                            )}
                        </div>

                        {progress && (
                            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing || !data.cv}
                            className="mt-8 w-full rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {processing ? t.submitting : t.submit}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-600">
                        {t.privacyNote}
                    </p>
                </div>
            </div>
        </>
    );
}
