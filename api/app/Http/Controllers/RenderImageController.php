<?php

namespace App\Http\Controllers;

use App\Http\Requests\RenderImageRequest;
use App\Services\NotionImageRenderer;
use App\Services\RendererException;
use App\Services\RenderRequestFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class RenderImageController extends Controller
{
    public function __invoke(
        RenderImageRequest $request,
        RenderRequestFactory $factory,
        NotionImageRenderer $renderer,
    ): Response|JsonResponse {
        try {
            $image = $renderer->render($factory->make($request->validated()));
        } catch (RendererException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }

        return response($image->contents, 200, [
            'Content-Type' => $image->mimeType,
            'Content-Disposition' => "inline; filename=\"notion-image.{$image->format}\"",
            'Cache-Control' => 'no-store',
            'X-Render-Width' => (string) $image->width,
            'X-Render-Height' => (string) $image->height,
        ]);
    }
}
