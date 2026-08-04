export type CvAnalysisSeverity = 'critico' | 'mejorable' | 'ok';

export interface CvAnalysisSection {
    name: string;
    severity: CvAnalysisSeverity;
    feedback: string;
}

export interface CvAnalysisBulletRewrite {
    original: string;
    improved: string;
    reason: string;
}

export interface CvAnalysisResult {
    score: number;
    summary: string;
    sections: CvAnalysisSection[];
    missing_keywords: string[];
    bullet_rewrites: CvAnalysisBulletRewrite[];
}

export type CvAnalysisStatusValue =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed';

export interface CvAnalysis {
    id: string;
    status: CvAnalysisStatusValue;
    original_filename: string;
    result: CvAnalysisResult | null;
    error_message: string | null;
}
