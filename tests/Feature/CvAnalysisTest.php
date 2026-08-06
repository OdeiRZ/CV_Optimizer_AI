<?php

use App\Enums\CvAnalysisStatus;
use App\Jobs\AnalyzeCvJob;
use App\Models\CvAnalysis;
use App\Services\CvAnalysisSchema;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Prism\Prism\Facades\Prism;
use Prism\Prism\Testing\StructuredResponseFake;

function fakeCvUpload(string $filename = 'cv.pdf'): UploadedFile
{
    return UploadedFile::fake()->create($filename, 50, 'application/pdf');
}

it('renders the upload page', function () {
    $this->get(route('cv-analyses.create'))->assertOk();
});

it('rejects files that are not pdf or docx', function () {
    Storage::fake('local');

    $response = $this->post(route('cv-analyses.store'), [
        'cv' => UploadedFile::fake()->create('cv.txt', 10, 'text/plain'),
    ]);

    $response->assertSessionHasErrors('cv');
});

it('stores the upload and dispatches the analysis job', function () {
    Storage::fake('local');
    Bus::fake();

    $response = $this->post(route('cv-analyses.store'), [
        'cv' => fakeCvUpload(),
        'job_description' => 'Senior Laravel Developer, 5+ years, REST APIs.',
    ]);

    $analysis = CvAnalysis::sole();

    expect($analysis->status)->toBe(CvAnalysisStatus::Pending)
        ->and($analysis->job_description)->toBe('Senior Laravel Developer, 5+ years, REST APIs.')
        ->and($analysis->original_filename)->toBe('cv.pdf');

    Storage::disk('local')->assertExists($analysis->file_path);

    $response->assertRedirect(route('cv-analyses.show', $analysis));

    Bus::assertDispatched(AnalyzeCvJob::class, fn (AnalyzeCvJob $job) => $job->analysis->is($analysis));
});

it('shows a friendly session error instead of a raw 429 once the daily limit is hit', function () {
    Storage::fake('local');
    Bus::fake();

    foreach (range(1, 10) as $_) {
        $this->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()])
            ->assertRedirect();
    }

    $response = $this->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()]);

    $response->assertSessionHasErrors('cv');
    Bus::assertDispatchedTimes(AnalyzeCvJob::class, 10);
});

it('completes the analysis and stores the structured result when the job runs', function () {
    Storage::fake('local');

    $path = UploadedFile::fake()->create('cv.pdf', 10)->store('cv-uploads', 'local');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => $path,
        'status' => CvAnalysisStatus::Pending,
    ]);

    $fakeResult = [
        'score' => 72,
        'summary' => 'CV sólido pero con algunas áreas de mejora.',
        'sections' => [
            ['name' => 'Formato', 'severity' => 'ok', 'feedback' => 'Estructura clara.'],
            ['name' => 'Experiencia', 'severity' => 'mejorable', 'feedback' => 'Faltan métricas cuantificadas.'],
            ['name' => 'Palabras clave', 'severity' => 'critico', 'feedback' => 'Faltan keywords del sector.'],
        ],
        'missing_keywords' => ['Docker', 'CI/CD'],
        'bullet_rewrites' => [
            [
                'original' => 'Responsable de mantenimiento de aplicaciones.',
                'improved' => 'Mantuve y optimicé 5 aplicaciones críticas, reduciendo incidencias un 30%.',
                'reason' => 'Voz pasiva y sin métricas.',
            ],
        ],
    ];

    Prism::fake([
        StructuredResponseFake::make()->withStructured($fakeResult),
    ]);

    // The PDF parser can't read a fake binary file, so we swap in a stub extractor for this test.
    $this->app->bind(\App\Services\CvTextExtractor::class, function () {
        return new class extends \App\Services\CvTextExtractor
        {
            public function extract(string $disk, string $path): string
            {
                return 'John Doe. Responsable de mantenimiento de aplicaciones.';
            }
        };
    });

    (new AnalyzeCvJob($analysis))->handle($this->app->make(\App\Services\CvTextExtractor::class));

    $analysis->refresh();

    expect($analysis->status)->toBe(CvAnalysisStatus::Completed)
        ->and($analysis->result)->toBe($fakeResult);
});

it('marks the analysis as failed when text extraction throws', function () {
    Storage::fake('local');

    $path = UploadedFile::fake()->create('cv.pdf', 10)->store('cv-uploads', 'local');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => $path,
        'status' => CvAnalysisStatus::Pending,
    ]);

    $this->app->bind(\App\Services\CvTextExtractor::class, function () {
        return new class extends \App\Services\CvTextExtractor
        {
            public function extract(string $disk, string $path): string
            {
                throw new \RuntimeException('No text could be extracted from the uploaded CV.');
            }
        };
    });

    Prism::fake();

    $job = new AnalyzeCvJob($analysis);

    expect(fn () => $job->handle($this->app->make(\App\Services\CvTextExtractor::class)))
        ->toThrow(RuntimeException::class);

    $analysis->refresh();

    expect($analysis->status)->toBe(CvAnalysisStatus::Failed)
        ->and($analysis->error_message)->not->toBeNull();
});

it('returns the analysis status as json', function () {
    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Completed,
        'result' => ['score' => 80],
    ]);

    $this->getJson(route('cv-analyses.status', $analysis))
        ->assertOk()
        ->assertJson([
            'id' => $analysis->id,
            'status' => 'completed',
            'result' => ['score' => 80],
        ]);
});

it('downloads a pdf report for a completed analysis', function () {
    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Completed,
        'result' => [
            'score' => 80,
            'summary' => 'CV sólido.',
            'sections' => [
                ['name' => 'Formato', 'severity' => 'ok', 'feedback' => 'Estructura clara.'],
            ],
            'missing_keywords' => ['Docker'],
            'bullet_rewrites' => [
                ['original' => 'Antes', 'improved' => 'Después', 'reason' => 'Motivo'],
            ],
        ],
    ]);

    $response = $this->get(route('cv-analyses.report', $analysis));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('application/pdf');
});

it('returns 404 for a report of an analysis that is not completed', function () {
    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Pending,
    ]);

    $this->get(route('cv-analyses.report', $analysis))->assertNotFound();
});

it('builds a schema with the expected top-level fields', function () {
    $schema = CvAnalysisSchema::make()->toArray();

    expect($schema['properties'])->toHaveKeys([
        'score', 'summary', 'sections', 'missing_keywords', 'bullet_rewrites',
    ]);
});
