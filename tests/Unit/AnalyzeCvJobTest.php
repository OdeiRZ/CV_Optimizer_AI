<?php

use App\Jobs\AnalyzeCvJob;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

function fakeRequestException(int $status): RequestException
{
    return new RequestException(new Response(new PsrResponse($status)));
}

it('retries on a connection timeout', function () {
    expect(AnalyzeCvJob::shouldRetryHttpFailure(new ConnectionException('timed out')))->toBeTrue();
});

it('retries on a 5xx server error from the provider', function () {
    expect(AnalyzeCvJob::shouldRetryHttpFailure(fakeRequestException(529)))->toBeTrue();
});

it('retries on a 429 rate-limit response', function () {
    expect(AnalyzeCvJob::shouldRetryHttpFailure(fakeRequestException(429)))->toBeTrue();
});

it('does not retry a 4xx request error other than 429', function () {
    expect(AnalyzeCvJob::shouldRetryHttpFailure(fakeRequestException(400)))->toBeFalse();
    expect(AnalyzeCvJob::shouldRetryHttpFailure(fakeRequestException(401)))->toBeFalse();
    expect(AnalyzeCvJob::shouldRetryHttpFailure(fakeRequestException(413)))->toBeFalse();
});

it('does not retry an unrelated exception', function () {
    expect(AnalyzeCvJob::shouldRetryHttpFailure(new RuntimeException('something else')))->toBeFalse();
});

it('gives a specific, non-retry message for a RuntimeException (always from CvTextExtractor)', function () {
    // hallazgo de una auditoría de código: a CV with no extractable text
    // (a scanned PDF, a corrupted file) fails identically on every
    // retry - "inténtalo de nuevo" is misleading advice for it.
    $message = AnalyzeCvJob::errorMessageFor(new RuntimeException('No text could be extracted from the uploaded CV.'));

    expect($message)->toContain('texto')
        ->and($message)->not->toContain('Inténtalo de nuevo');
});

it('gives the generic retry message for anything that is not a RuntimeException', function () {
    expect(AnalyzeCvJob::errorMessageFor(new ConnectionException('timed out')))
        ->toContain('Inténtalo de nuevo')
        ->and(AnalyzeCvJob::errorMessageFor(fakeRequestException(529)))
        ->toContain('Inténtalo de nuevo');
});
