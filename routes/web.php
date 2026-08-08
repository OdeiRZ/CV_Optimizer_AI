<?php

use App\Http\Controllers\CvAnalysisController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [CvAnalysisController::class, 'create'])->name('cv-analyses.create');

Route::post('/cv-analyses', [CvAnalysisController::class, 'store'])
    ->middleware('throttle:cv-analysis')
    ->name('cv-analyses.store');

Route::get('/cv-analyses/{cvAnalysis}', [CvAnalysisController::class, 'show'])
    ->name('cv-analyses.show');

Route::get('/cv-analyses/{cvAnalysis}/status', [CvAnalysisController::class, 'status'])
    ->name('cv-analyses.status');

Route::get('/cv-analyses/{cvAnalysis}/report', [CvAnalysisController::class, 'downloadReport'])
    ->name('cv-analyses.report');

Route::get('/cv-analyses/{cvAnalysis}/file', [CvAnalysisController::class, 'previewFile'])
    ->name('cv-analyses.file');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

// TEMPORARY diagnostic for the Lighthouse-CI 404 mystery on
// /cv-analyses/{id}: logs any request Laravel's router itself couldn't
// match, to tell apart "request never reached routing" from "route matched,
// something else 404'd". Remove once root-caused.
Route::fallback(function (\Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Log::warning('DIAGNOSTIC: unmatched route', [
        'method' => $request->method(),
        'path' => $request->path(),
        'full_url' => $request->fullUrl(),
        'user_agent' => $request->userAgent(),
    ]);

    return response('diagnostic fallback: not found', 404);
});
