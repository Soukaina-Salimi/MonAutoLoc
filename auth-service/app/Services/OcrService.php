<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OcrService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = env('OCR_SERVICE_URL', 'http://localhost:8001');
    }

    public function extractDocument(string $filePath, string $docType): array
    {
        $response = Http::attach(
            'file',
            file_get_contents(storage_path('app/public/' . $filePath)),
            basename($filePath)
        )->post("{$this->baseUrl}/ocr/extract", [
            'doc_type' => $docType,
        ]);

        if ($response->failed()) {
            return ['success' => false, 'error' => 'OCR service unavailable'];
        }

        return $response->json();
    }
}
