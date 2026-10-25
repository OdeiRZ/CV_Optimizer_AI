import { severityForScore, severityStyles } from '@/lib/severity';

function strokeColor(score: number): string {
    if (score >= 80) return 'stroke-emerald-500 dark:stroke-emerald-400';
    if (score >= 50) return 'stroke-amber-500 dark:stroke-amber-400';
    return 'stroke-red-500 dark:stroke-red-400';
}

function textColor(score: number): string {
    if (score >= 80) return 'text-emerald-700 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-700 dark:text-amber-400';
    return 'text-red-700 dark:text-red-400';
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreGaugeProps {
    score: number;
    /** "de 100" / "out of 100". */
    label: string;
    /** El rango escrito ("Mejorable · 50–79"), por cada nivel. */
    rangeLabels: Record<'critico' | 'mejorable' | 'ok', string>;
}

/**
 * La puntuación en un anillo y, debajo, el rango escrito: el color solo no
 * basta (a quien no distingue el rojo del verde no le dice nada, WCAG 1.4.1).
 */
export default function ScoreGauge({ score, label, rangeLabels }: ScoreGaugeProps) {
    const clamped = Math.max(0, Math.min(100, score));
    const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
    const severity = severityForScore(clamped);

    return (
        <div className="flex flex-col items-center">
            <div className="relative h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        strokeWidth="10"
                        className="stroke-slate-200 dark:stroke-slate-800"
                    />
                    <circle
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        fill="none"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={offset}
                        className={`transition-[stroke-dashoffset] duration-700 ease-out ${strokeColor(clamped)}`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold tabular-nums ${textColor(clamped)}`}>
                        {score}
                    </span>
                    <span className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {label}
                    </span>
                </div>
            </div>
            <span
                className={`mt-3 rounded-full px-3 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[severity]}`}
            >
                {rangeLabels[severity]}
            </span>
        </div>
    );
}
