function strokeColor(score: number): string {
    if (score >= 80) return 'stroke-emerald-500 dark:stroke-emerald-400';
    if (score >= 50) return 'stroke-amber-500 dark:stroke-amber-400';
    return 'stroke-red-500 dark:stroke-red-400';
}

function textColor(score: number): string {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreGauge({ score, label }: { score: number; label: string }) {
    const clamped = Math.max(0, Math.min(100, score));
    const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

    return (
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
                <span className={`text-4xl font-bold ${textColor(clamped)}`}>{score}</span>
                <span className="mt-1 text-xs text-slate-500">{label}</span>
            </div>
        </div>
    );
}
