<?php

namespace App\Http\Controllers;

use App\Services\OcrService;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function upload(Request $request, OcrService $ocr)
    {
        $request->validate([
            'document' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'doc_type' => 'required|in:cin,permis,carte_grise',
        ]);

        // Sauvegarder le fichier
        $path = $request->file('document')->store('documents', 'public');

        // Appeler l'OCR
        $result = $ocr->extractDocument($path, $request->doc_type);

        return response()->json([
            'path' => $path,
            'ocr' => $result,
        ]);
    }
}
