<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class McpRenderDownloadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32))]);
    }

    public function test_a_signed_link_downloads_the_full_resolution_render(): void
    {
        config(['services.notion_image_renderer.url' => 'https://renderer.test']);
        Http::fake([
            'renderer.test/api/render' => Http::response('full-png-bytes', 200, [
                'Content-Type' => 'image/png',
                'X-Render-Format' => 'png',
                'X-Render-Width' => '1500',
                'X-Render-Height' => '600',
            ]),
        ]);

        $payload = $this->encode([
            'format' => 'png',
            'width' => 1500,
            'params' => ['surface' => 'letters', 'text' => 'PLATFORM', 'aspect' => 2.5],
        ]);
        $url = URL::temporarySignedRoute(
            name: 'mcp-renders.download',
            expiration: now()->addMinutes(15),
            parameters: ['payload' => $payload],
            absolute: false,
        );

        $this->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Content-Disposition', 'attachment; filename="notion-image.png"')
            ->assertContent('full-png-bytes');

        Http::assertSent(fn (Request $request): bool => $request['width'] === 1500
            && $request['params']['text'] === 'PLATFORM');
    }

    public function test_an_unsigned_download_is_rejected(): void
    {
        $payload = $this->encode(['format' => 'png', 'width' => 1500, 'params' => []]);

        $this->get("/mcp/renders/{$payload}")->assertForbidden();
    }

    public function test_the_api_exposes_the_generator_favicon(): void
    {
        $this->get('/favicon.ico')
            ->assertRedirect('https://notion-images.laravel.cloud/generative-design-ico.png');

        $this->get('/generative-design-ico.svg')
            ->assertRedirect('https://notion-images.laravel.cloud/generative-design-ico.svg');
    }

    /** @param array<string, mixed> $payload */
    private function encode(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }
}
