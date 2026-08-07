<?php

namespace App\Http\Controllers;

use App\Enums\CvAnalysisLanguage;
use App\Enums\CvAnalysisStatus;
use App\Http\Requests\StoreCvAnalysisRequest;
use App\Jobs\AnalyzeCvJob;
use App\Models\CvAnalysis;
use App\Support\CvAnalysisRateLimiter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class CvAnalysisController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('CvAnalyses/Create', [
            'maxUploadKb' => config('cv.max_upload_kb'),
            'dailyLimit' => config('cv.daily_analysis_limit'),
            'remainingToday' => CvAnalysisRateLimiter::remaining($request),
        ]);
    }

    public function store(StoreCvAnalysisRequest $request): RedirectResponse
    {
        $file = $request->file('cv');
        $path = $file->store('cv-uploads');

        $analysis = CvAnalysis::create([
            'user_id' => $request->user()?->id,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'job_description' => $request->validated('job_description'),
            'language' => $request->validated('language') ?? CvAnalysisLanguage::Spanish->value,
            'status' => CvAnalysisStatus::Pending,
        ]);

        try {
            AnalyzeCvJob::dispatch($analysis, CvAnalysisRateLimiter::key($request));
        } catch (Throwable) {
            // With QUEUE_CONNECTION=sync (production), the job runs inline
            // here and rethrows after recording itself as Failed, so a real
            // async queue worker can retry it. That rethrow must not turn
            // into a raw 500 for the request that's about to redirect to a
            // page which already knows how to show that Failed state.
        }

        return to_route('cv-analyses.show', $analysis);
    }

    public function show(CvAnalysis $cvAnalysis): Response
    {
        return Inertia::render('CvAnalyses/Show', [
            'analysis' => $this->toPayload($cvAnalysis),
        ]);
    }

    public function status(CvAnalysis $cvAnalysis): JsonResponse
    {
        return response()->json($this->toPayload($cvAnalysis));
    }

    public function downloadReport(CvAnalysis $cvAnalysis): HttpResponse
    {
        if ($cvAnalysis->status !== CvAnalysisStatus::Completed || ! $cvAnalysis->result) {
            throw new NotFoundHttpException;
        }

        $pdf = Pdf::loadView('cv-analyses.report', [
            'analysis' => $cvAnalysis,
            'result' => $cvAnalysis->result,
        ]);

        return $pdf->download("analisis-cv-{$cvAnalysis->id}.pdf");
    }

    /**
     * Serves the originally uploaded file inline (not as an attachment) so
     * the results page can embed it in an <iframe> preview. Only PDFs are
     * supported: DOCX has no equivalent native browser viewer, and rendering
     * one server-side would need a heavy dependency (e.g. LibreOffice
     * headless) that isn't viable on Render's free tier.
     */
    public function previewFile(CvAnalysis $cvAnalysis): StreamedResponse
    {
        if (! $this->isPdf($cvAnalysis) || ! Storage::exists($cvAnalysis->file_path)) {
            throw new NotFoundHttpException;
        }

        return Storage::response($cvAnalysis->file_path, $cvAnalysis->original_filename);
    }

    protected function isPdf(CvAnalysis $cvAnalysis): bool
    {
        return strtolower(pathinfo($cvAnalysis->file_path, PATHINFO_EXTENSION)) === 'pdf';
    }

    /**
     * @return array<string, mixed>
     */
    protected function toPayload(CvAnalysis $cvAnalysis): array
    {
        return [
            'id' => $cvAnalysis->id,
            'status' => $cvAnalysis->status->value,
            'original_filename' => $cvAnalysis->original_filename,
            'language' => $cvAnalysis->language->value,
            'result' => $cvAnalysis->result,
            'error_message' => $cvAnalysis->error_message,
            'is_pdf' => $this->isPdf($cvAnalysis),
        ];
    }
}
