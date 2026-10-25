import { useEffect, useRef, useState } from 'react';

interface CopyButtonProps {
    /** Lo que se copia al portapapeles. */
    text: string;
    label: string;
    copiedLabel: string;
    failedLabel: string;
    className?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copia un texto y dice qué ha pasado: "Copiado", o "No se ha podido copiar"
 * cuando el navegador lo impide (permisos, contexto no seguro). Antes un
 * fallo no se avisaba y el botón parecía no hacer nada.
 */
export default function CopyButton({
    text,
    label,
    copiedLabel,
    failedLabel,
    className = '',
}: CopyButtonProps) {
    const [state, setState] = useState<CopyState>('idle');
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const copy = async () => {
        let next: CopyState = 'copied';

        try {
            await navigator.clipboard.writeText(text);
        } catch {
            next = 'failed';
        }

        setState(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState('idle'), 2000);
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className={`inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900 ${className}`}
        >
            {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label}
        </button>
    );
}
