<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\Element\AbstractContainer;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;
use Smalot\PdfParser\Parser as PdfParser;

class CvTextExtractor
{
    /**
     * Extract plain text from a CV file (PDF or DOCX) stored on the given disk.
     */
    public function extract(string $disk, string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $absolutePath = Storage::disk($disk)->path($path);

        $text = $this->withResourceLimits(fn () => match ($extension) {
            'pdf' => $this->extractFromPdf($absolutePath),
            'docx' => $this->extractFromDocx($absolutePath),
            default => throw new RuntimeException("Unsupported CV file extension: {$extension}"),
        });

        $text = trim($text);

        if ($text === '') {
            throw new RuntimeException('No text could be extracted from the uploaded CV.');
        }

        return $text;
    }

    /**
     * Caps memory and execution time around the actual parsing call
     * (hallazgo de una auditoría de código): PdfParser/PhpWord have no
     * ceiling of their own, and neither the base php:8.3-cli-alpine image
     * nor this repo ship a php.ini overriding PHP's compiled-in defaults
     * (unlimited memory_limit for the CLI SAPI). In production, extraction
     * runs inline within the HTTP request (QUEUE_CONNECTION=sync) on one
     * of only 4 PHP workers total for the whole site - a pathological
     * DOCX (a small ZIP that decompresses to gigabytes of XML) or a
     * malformed PDF that hangs the parser would otherwise have nothing
     * stopping it from exhausting the container's memory or tying up a
     * worker indefinitely, denying the site to everyone else. Limits
     * chosen generously for a real CV (parsing one normally takes well
     * under a second and a few MB) while still bounding the worst case.
     * Restored afterward so they don't leak into whatever else runs later
     * in the same process/request.
     */
    protected function withResourceLimits(callable $callback): string
    {
        $previousMemoryLimit = ini_get('memory_limit');
        $previousTimeLimit = ini_get('max_execution_time');

        ini_set('memory_limit', '256M');
        set_time_limit(20);

        try {
            return $callback();
        } finally {
            ini_set('memory_limit', $previousMemoryLimit);
            set_time_limit((int) $previousTimeLimit);
        }
    }

    protected function extractFromPdf(string $absolutePath): string
    {
        return (new PdfParser)->parseFile($absolutePath)->getText();
    }

    protected function extractFromDocx(string $absolutePath): string
    {
        $phpWord = IOFactory::load($absolutePath, 'Word2007');

        $text = '';

        foreach ($phpWord->getSections() as $section) {
            $text .= $this->extractFromContainer($section);
        }

        // PhpWord returns text nodes with their XML entities (e.g. &#039;)
        // left un-decoded, since Text::getText() reads the raw <w:t> content.
        return html_entity_decode($text, ENT_QUOTES | ENT_HTML5);
    }

    protected function extractFromContainer(AbstractContainer $container): string
    {
        $text = '';

        foreach ($container->getElements() as $element) {
            if ($element instanceof Text) {
                $text .= $element->getText().' ';

                continue;
            }

            if ($element instanceof Table) {
                foreach ($element->getRows() as $row) {
                    foreach ($row->getCells() as $cell) {
                        $text .= $this->extractFromContainer($cell);
                    }
                }

                continue;
            }

            if ($element instanceof AbstractContainer) {
                $text .= $this->extractFromContainer($element)."\n";

                continue;
            }

            if (method_exists($element, 'getText')) {
                $value = $element->getText();

                if (is_string($value)) {
                    $text .= $value.' ';
                }
            }
        }

        return $text;
    }
}
