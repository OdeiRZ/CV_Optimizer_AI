<?php

use App\Enums\CvAnalysisLanguage;
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

it('tells the frontend the configured upload size limit', function () {
    $this->get(route('cv-analyses.create'))
        ->assertInertia(fn ($page) => $page->where('maxUploadKb', config('cv.max_upload_kb')));
});

it('tells the frontend how many analyses are left today', function () {
    Storage::fake('local');
    Bus::fake();

    $limit = config('cv.daily_analysis_limit');

    $this->get(route('cv-analyses.create'))
        ->assertInertia(fn ($page) => $page
            ->where('dailyLimit', $limit)
            ->where('remainingToday', $limit));

    $this->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()])->assertRedirect();

    $this->get(route('cv-analyses.create'))
        ->assertInertia(fn ($page) => $page->where('remainingToday', $limit - 1));
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
        ->and($analysis->original_filename)->toBe('cv.pdf')
        ->and($analysis->language)->toBe(CvAnalysisLanguage::Spanish);

    Storage::disk('local')->assertExists($analysis->file_path);

    $response->assertRedirect(route('cv-analyses.show', $analysis));

    Bus::assertDispatched(AnalyzeCvJob::class, fn (AnalyzeCvJob $job) => $job->analysis->is($analysis));
});

it('stores the requested response language', function () {
    Storage::fake('local');
    Bus::fake();

    $this->post(route('cv-analyses.store'), [
        'cv' => fakeCvUpload(),
        'language' => 'en',
    ]);

    expect(CvAnalysis::sole()->language)->toBe(CvAnalysisLanguage::English);
});

it('rejects an unsupported language value', function () {
    Storage::fake('local');

    $response = $this->post(route('cv-analyses.store'), [
        'cv' => fakeCvUpload(),
        'language' => 'fr',
    ]);

    $response->assertSessionHasErrors('language');
});

it('still redirects to the results page when the sync-dispatched job throws', function () {
    // Production runs QUEUE_CONNECTION=sync (see phpunit.xml for tests), so
    // AnalyzeCvJob::handle() runs inline inside the store() request. Its
    // catch block records the analysis as Failed but then rethrows (so a
    // real async queue worker can retry it) - store() must not let that
    // rethrow bubble into a raw, un-Inertia'd 500 response.
    Storage::fake('local');

    $this->app->bind(\App\Services\CvTextExtractor::class, function () {
        return new class extends \App\Services\CvTextExtractor
        {
            public function extract(string $disk, string $path): string
            {
                throw new \RuntimeException('No text could be extracted from the uploaded CV.');
            }
        };
    });

    $response = $this->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()]);

    $analysis = CvAnalysis::sole();

    $response->assertRedirect(route('cv-analyses.show', $analysis));
    expect($analysis->status)->toBe(CvAnalysisStatus::Failed)
        ->and($analysis->error_message)->not->toBeNull();
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

it('rate-limits by the Cloudflare connecting IP even when the resolved request IP is unstable', function () {
    // Live testing found that behind Render + Cloudflare, $request->ip()
    // resolves to Render's own internal load-balancer address rather than
    // the visitor's IP, and that address isn't even stable request-to-
    // request - which silently defeated this limiter entirely (11
    // consecutive live requests, zero blocked). Simulate that instability
    // via a different REMOTE_ADDR on every request, alongside a constant
    // CF-Connecting-IP: the limiter must still trip on the 11th request.
    Storage::fake('local');
    Bus::fake();

    foreach (range(1, 10) as $i) {
        $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
            ->withHeaders(['CF-Connecting-IP' => '84.127.128.30'])
            ->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()])
            ->assertRedirect();
    }

    $response = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.11'])
        ->withHeaders(['CF-Connecting-IP' => '84.127.128.30'])
        ->post(route('cv-analyses.store'), ['cv' => fakeCvUpload()]);

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

it('serves the original pdf inline for preview', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cv-uploads/fake.pdf', '%PDF-1.4 fake content');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Completed,
    ]);

    $response = $this->get(route('cv-analyses.file', $analysis));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toBe('application/pdf');
    expect($response->headers->get('Content-Disposition'))->toContain('inline');
});

it('returns 404 previewing a non-pdf file', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cv-uploads/fake.docx', 'fake docx content');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.docx',
        'file_path' => 'cv-uploads/fake.docx',
        'status' => CvAnalysisStatus::Completed,
    ]);

    $this->get(route('cv-analyses.file', $analysis))->assertNotFound();
});

it('returns 404 previewing a pdf whose file no longer exists on disk', function () {
    Storage::fake('local');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/missing.pdf',
        'status' => CvAnalysisStatus::Completed,
    ]);

    $this->get(route('cv-analyses.file', $analysis))->assertNotFound();
});

it('tells the frontend whether the uploaded file is a pdf that can be previewed', function () {
    $pdfAnalysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Pending,
    ]);
    $docxAnalysis = CvAnalysis::create([
        'original_filename' => 'cv.docx',
        'file_path' => 'cv-uploads/fake.docx',
        'status' => CvAnalysisStatus::Pending,
    ]);

    $this->get(route('cv-analyses.show', $pdfAnalysis))
        ->assertInertia(fn ($page) => $page->where('analysis.is_pdf', true));
    $this->get(route('cv-analyses.show', $docxAnalysis))
        ->assertInertia(fn ($page) => $page->where('analysis.is_pdf', false));
});

it('builds a schema with the expected top-level fields', function () {
    $schema = CvAnalysisSchema::make()->toArray();

    expect($schema['properties'])->toHaveKeys([
        'score', 'summary', 'sections', 'missing_keywords', 'bullet_rewrites',
    ]);
});

it('builds a schema that asks for output in the requested language', function () {
    $spanish = CvAnalysisSchema::make(CvAnalysisLanguage::Spanish)->toArray();
    $english = CvAnalysisSchema::make(CvAnalysisLanguage::English)->toArray();

    expect($spanish['properties']['summary']['description'])->toContain('Spanish')
        ->and($english['properties']['summary']['description'])->toContain('English');
});

it('downloads an english pdf report when the analysis language is english', function () {
    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/fake.pdf',
        'status' => CvAnalysisStatus::Completed,
        'language' => CvAnalysisLanguage::English,
        'result' => [
            'score' => 80,
            'summary' => 'Solid CV.',
            'sections' => [
                ['name' => 'Format', 'severity' => 'ok', 'feedback' => 'Clear structure.'],
            ],
            'missing_keywords' => ['Docker'],
            'bullet_rewrites' => [
                ['original' => 'Before', 'improved' => 'After', 'reason' => 'Reason'],
            ],
        ],
    ]);

    $this->get(route('cv-analyses.report', $analysis))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});
