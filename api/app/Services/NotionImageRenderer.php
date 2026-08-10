<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class NotionImageRenderer
{
    /**
     * @param  array{format: string, width: int, params: array<string, mixed>}  $payload
     */
    public function render(array $payload): RenderedImage
    {
        try {
            $response = $this->client()->post('/api/render', $payload);
        } catch (ConnectionException $exception) {
            throw new RendererException('The image renderer is unavailable.', previous: $exception);
        }

        if ($response->failed()) {
            throw new RendererException(
                message: $response->json('error') ?: 'The image renderer rejected the request.',
                status: $response->status() === 422 ? 422 : 502,
            );
        }

        return new RenderedImage(
            contents: $response->body(),
            mimeType: str($response->header('Content-Type', 'image/png'))->before(';')->toString(),
            format: $response->header('X-Render-Format', $payload['format']),
            width: (int) $response->header('X-Render-Width', (string) $payload['width']),
            height: (int) $response->header('X-Render-Height', '0'),
        );
    }

    private function client(): PendingRequest
    {
        $request = Http::baseUrl(rtrim((string) config('services.notion_image_renderer.url'), '/'))
            ->accept('image/*')
            ->timeout((int) config('services.notion_image_renderer.timeout', 30));

        $token = (string) config('services.notion_image_renderer.token', '');

        return $token === '' ? $request : $request->withToken($token);
    }
}
