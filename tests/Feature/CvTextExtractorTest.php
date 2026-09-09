<?php

use App\Services\CvTextExtractor;
use Illuminate\Support\Facades\Storage;

function storeSamplePdf(): string
{
    Storage::fake('local');

    $path = 'cv-uploads/sample.pdf';
    Storage::disk('local')->put($path, file_get_contents(base_path('public/samples/sample-cv.pdf')));

    return $path;
}

it('still extracts real text from a legitimate PDF under the resource limits', function () {
    $path = storeSamplePdf();

    $text = (new CvTextExtractor)->extract('local', $path);

    expect($text)->not->toBe('');
});

it('restores whatever memory_limit/max_execution_time were set before, not a hardcoded default', function () {
    $path = storeSamplePdf();

    // A value comfortably above whatever the rest of the suite has
    // already allocated in this same process by the time this test
    // runs (ini_set() itself fails if the target is below current
    // usage) - deliberately different from the 256M the wrapper sets
    // internally, so a pass here proves real restoration, not a
    // coincidence.
    ini_set('memory_limit', '512M');
    ini_set('max_execution_time', '5');

    (new CvTextExtractor)->extract('local', $path);

    expect(ini_get('memory_limit'))->toBe('512M')
        ->and(ini_get('max_execution_time'))->toBe('5');
});

it('restores the previous limits even when the parser throws', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cv-uploads/not-a-pdf.pdf', 'this is not a real pdf');

    // A value comfortably above whatever the rest of the suite has
    // already allocated in this same process by the time this test
    // runs (ini_set() itself fails if the target is below current
    // usage) - deliberately different from the 256M the wrapper sets
    // internally, so a pass here proves real restoration, not a
    // coincidence.
    ini_set('memory_limit', '512M');
    ini_set('max_execution_time', '5');

    $thrown = null;

    try {
        (new CvTextExtractor)->extract('local', 'cv-uploads/not-a-pdf.pdf');
    } catch (Throwable $e) {
        $thrown = $e;
    }

    expect($thrown)->not->toBeNull()
        ->and(ini_get('memory_limit'))->toBe('512M')
        ->and(ini_get('max_execution_time'))->toBe('5');
});
