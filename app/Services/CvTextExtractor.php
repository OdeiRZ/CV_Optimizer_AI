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

        $text = match ($extension) {
            'pdf' => $this->extractFromPdf($absolutePath),
            'docx' => $this->extractFromDocx($absolutePath),
            default => throw new RuntimeException("Unsupported CV file extension: {$extension}"),
        };

        $text = trim($text);

        if ($text === '') {
            throw new RuntimeException('No text could be extracted from the uploaded CV.');
        }

        return $text;
    }

    protected function extractFromPdf(string $absolutePath): string
    {
        return (new PdfParser())->parseFile($absolutePath)->getText();
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
