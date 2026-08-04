import { FormEventHandler, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, progress, errors } = useForm<{
        cv: File | null;
        job_description: string;
    }>({
        cv: null,
        job_description: '',
    });

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('cv-analyses.store'), { forceFormData: true });
    };

    const handleFiles = (files: FileList | null) => {
        const file = files?.[0];
        if (file) {
            setData('cv', file);
        }
    };

    return (
        <>
            <Head title="Analizador de CV con IA" />

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
                <div className="mx-auto max-w-3xl px-6 py-16">
                    <header className="mb-12 text-center">
                        <p className="mb-3 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                            Impulsado por IA
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                            Optimiza tu CV en segundos
                        </h1>
                        <p className="mx-auto mt-4 max-w-xl text-slate-400">
                            Sube tu CV y, opcionalmente, la oferta a la que
                            aspiras. Recibe una puntuación tipo ATS, feedback
                            accionable y reescrituras de tus puntos más
                            débiles.
                        </p>
                    </header>

                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-black/20 backdrop-blur"
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
                                    : 'border-slate-700 hover:border-slate-600'
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
                                <p className="font-medium text-emerald-400">
                                    {data.cv.name}
                                </p>
                            ) : (
                                <>
                                    <p className="font-medium text-slate-200">
                                        Arrastra tu CV aquí o haz clic para
                                        subirlo
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        PDF o DOCX, máx. 5&nbsp;MB
                                    </p>
                                </>
                            )}
                        </div>
                        {errors.cv && (
                            <p className="mt-2 text-sm text-red-400">
                                {errors.cv}
                            </p>
                        )}

                        <div className="mt-6">
                            <label
                                htmlFor="job_description"
                                className="mb-2 block text-sm font-medium text-slate-300"
                            >
                                Oferta de trabajo (opcional)
                            </label>
                            <textarea
                                id="job_description"
                                rows={5}
                                value={data.job_description}
                                onChange={(e) =>
                                    setData('job_description', e.target.value)
                                }
                                placeholder="Pega aquí la descripción del puesto para recibir un análisis de compatibilidad y palabras clave ausentes."
                                className="w-full rounded-lg border-slate-700 bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            {errors.job_description && (
                                <p className="mt-2 text-sm text-red-400">
                                    {errors.job_description}
                                </p>
                            )}
                        </div>

                        {progress && (
                            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
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
                            {processing ? 'Subiendo...' : 'Analizar mi CV'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-600">
                        Tu CV se usa únicamente para generar este análisis.
                    </p>
                </div>
            </div>
        </>
    );
}
