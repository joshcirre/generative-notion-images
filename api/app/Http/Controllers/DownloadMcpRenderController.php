<?php

namespace App\Http\Controllers;

use App\Services\NotionImageRenderer;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DownloadMcpRenderController extends Controller
{
    public function __invoke(Request $request, string $payload, NotionImageRenderer $renderer): Response
    {
        $encoded = strtr($payload, '-_', '+/');
        $encoded .= str_repeat('=', (4 - strlen($encoded) % 4) % 4);
        $json = base64_decode($encoded, true);
        abort_if($json === false, 404);

        $renderPayload = json_decode($json, true);
        abort_unless(is_array($renderPayload), 404);
        abort_unless(in_array($renderPayload['format'] ?? null, ['png', 'svg'], true), 404);
        abort_unless(is_int($renderPayload['width'] ?? null), 404);
        abort_unless(is_array($renderPayload['params'] ?? null), 404);

        $image = $renderer->render($renderPayload);
        $extension = $image->format === 'svg' ? 'svg' : 'png';
        $disposition = $request->boolean('inline') ? 'inline' : 'attachment';

        return response($image->contents, 200, [
            'Content-Type' => $image->mimeType,
            'Content-Disposition' => "{$disposition}; filename=\"notion-image.{$extension}\"",
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
