<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RenderImageApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.agent_api.token' => 'agent-secret',
            'services.notion_image_renderer.url' => 'https://renderer.test',
            'services.notion_image_renderer.token' => 'renderer-secret',
        ]);
    }

    public function test_it_requires_the_agent_token(): void
    {
        $this->postJson('/api/renders')->assertUnauthorized();
    }

    public function test_it_translates_and_proxies_a_render_request(): void
    {
        Http::fake([
            'renderer.test/api/render' => Http::response('png-bytes', 200, [
                'Content-Type' => 'image/png',
                'X-Render-Format' => 'png',
                'X-Render-Width' => '1500',
                'X-Render-Height' => '600',
            ]),
        ]);

        $response = $this->withToken('agent-secret')->postJson('/api/renders', [
            'text' => 'PLATFORM',
            'layout' => 'header',
            'palette_preset' => 'ocean',
            'background' => 'both',
            'background_mode' => 'islands',
            'background_seed' => 91,
            'background_density' => 46,
            'params' => ['seed' => 42, 'backgroundPatternReach' => 24],
        ]);

        $response->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Render-Width', '1500')
            ->assertContent('png-bytes');

        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'https://renderer.test/api/render'
                && $request->hasHeader('Authorization', 'Bearer renderer-secret')
                && $request['params']['surface'] === 'letters'
                && $request['params']['text'] === 'PLATFORM'
                && $request['params']['baseline'] === 'flat'
                && $request['params']['colorMid'] === '#2d7cb8'
                && $request['params']['backgroundLayer'] === 'both'
                && $request['params']['backgroundPatternMode'] === 'islands'
                && $request['params']['backgroundPatternSeed'] === 91
                && $request['params']['backgroundPatternCoverage'] === 46
                && $request['params']['backgroundPatternReach'] === 24
                && $request['params']['seed'] === 42
                && $request['params']['aspect'] === 2.5;
        });
    }

    public function test_it_rejects_removed_title_and_symbol_fields(): void
    {
        $this->withToken('agent-secret')->postJson('/api/renders', [
            'title' => 'Ordinary overlay text',
            'ornaments' => 'perimeter',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'ornaments']);
    }

    public function test_it_rate_limits_authenticated_rendering(): void
    {
        config([
            'services.agent_api.token' => 'limited-secret',
            'services.agent_api.rate_limit' => 1,
        ]);
        Http::fake([
            'renderer.test/api/render' => Http::response('<svg/>', 200, [
                'Content-Type' => 'image/svg+xml',
                'X-Render-Format' => 'svg',
                'X-Render-Width' => '1500',
                'X-Render-Height' => '600',
            ]),
        ]);

        $this->withToken('limited-secret')->postJson('/api/renders', ['format' => 'svg'])
            ->assertOk();
        $this->withToken('limited-secret')->postJson('/api/renders', ['format' => 'svg'])
            ->assertTooManyRequests();
    }

    public function test_it_returns_a_clear_gateway_error_when_the_renderer_is_down(): void
    {
        Http::fake([
            'renderer.test/api/render' => Http::response(['error' => 'Renderer is warming up.'], 503),
        ]);

        $this->withToken('agent-secret')->postJson('/api/renders')
            ->assertStatus(502)
            ->assertJson(['message' => 'Renderer is warming up.']);
    }
}
