<?php

use App\Models\CvAnalysis;
use Illuminate\Support\Facades\Storage;

function makeCvAnalysisAt(string $createdAt, string $path): CvAnalysis
{
    Storage::disk('local')->put($path, 'contenido de prueba');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => $path,
    ]);

    $analysis->forceFill(['created_at' => $createdAt])->save();

    return $analysis;
}

it('deletes analyses older than 30 days by default, along with their file', function () {
    Storage::fake('local');

    $old = makeCvAnalysisAt(now()->subDays(31)->toDateTimeString(), 'cv-uploads/old.pdf');
    $recent = makeCvAnalysisAt(now()->subDays(10)->toDateTimeString(), 'cv-uploads/recent.pdf');

    $this->artisan('cv-analyses:prune')->assertSuccessful();

    expect(CvAnalysis::find($old->id))->toBeNull();
    expect(CvAnalysis::find($recent->id))->not->toBeNull();
    Storage::disk('local')->assertMissing('cv-uploads/old.pdf');
    Storage::disk('local')->assertExists('cv-uploads/recent.pdf');
});

it('respects a custom --days option', function () {
    Storage::fake('local');

    $analysis = makeCvAnalysisAt(now()->subDays(5)->toDateTimeString(), 'cv-uploads/casi-nuevo.pdf');

    $this->artisan('cv-analyses:prune', ['--days' => 3])->assertSuccessful();

    expect(CvAnalysis::find($analysis->id))->toBeNull();
});

it('deletes the row even when its file was already gone', function () {
    Storage::fake('local');

    $analysis = CvAnalysis::create([
        'original_filename' => 'cv.pdf',
        'file_path' => 'cv-uploads/ya-no-existe.pdf',
    ]);
    $analysis->forceFill(['created_at' => now()->subDays(31)])->save();

    $this->artisan('cv-analyses:prune')->assertSuccessful();

    expect(CvAnalysis::find($analysis->id))->toBeNull();
});
