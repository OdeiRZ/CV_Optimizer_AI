import { CvAnalysisSeverity } from '@/types/cv';

// Colores de cada nivel (pastillas, iconos del feedback y rango de la
// puntuación). Los textos pasan de 4,5:1 sobre su fondo en claro y oscuro.
export const severityStyles: Record<CvAnalysisSeverity, string> = {
    critico:
        'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
    mejorable:
        'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
    ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
};

// Lo que más pesa, primero.
export const severityOrder: Record<CvAnalysisSeverity, number> = {
    critico: 0,
    mejorable: 1,
    ok: 2,
};

export const severityIcon: Record<CvAnalysisSeverity, string> = {
    critico: '!',
    mejorable: '~',
    ok: '✓',
};

/** El nivel que le toca a una puntuación: 0–49, 50–79 y 80–100. */
export function severityForScore(score: number): CvAnalysisSeverity {
    if (score >= 80) {
        return 'ok';
    }

    return score >= 50 ? 'mejorable' : 'critico';
}
