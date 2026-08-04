<?php

namespace App\Http\Controllers;

use App\Enums\CvAnalysisStatus;
use App\Http\Requests\StoreCvAnalysisRequest;
use App\Jobs\AnalyzeCvJob;
use App\Models\CvAnalysis;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class CvAnalysisController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('CvAnalyses/Create');
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
            'status' => CvAnalysisStatus::Pending,
        ]);

        AnalyzeCvJob::dispatch($analysis);

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

    /**
     * @return array<string, mixed>
     */
    protected function toPayload(CvAnalysis $cvAnalysis): array
    {
        return [
            'id' => $cvAnalysis->id,
            'status' => $cvAnalysis->status->value,
            'original_filename' => $cvAnalysis->original_filename,
            'result' => $cvAnalysis->result,
            'error_message' => $cvAnalysis->error_message,
        ];
    }
}
