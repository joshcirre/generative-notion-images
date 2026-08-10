<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PublicMcpEndpointTest extends TestCase
{
    public function test_mcp_initialization_is_public(): void
    {
        $request = $this->withHeaders([
            'Accept' => 'application/json, text/event-stream',
        ]);
        $payload = [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'initialize',
            'params' => [
                'protocolVersion' => '2025-06-18',
                'capabilities' => [],
                'clientInfo' => ['name' => 'test-client', 'version' => '1.0'],
            ],
        ];

        $request->postJson('/mcp/notion-images', $payload)->assertOk()
            ->assertJsonPath('result.serverInfo.name', 'Notion Image Server');
        $request->postJson('/mcp/notion-images', $payload)->assertOk();
    }

    public function test_rest_rendering_remains_private(): void
    {
        config(['services.agent_api.token' => 'rest-secret']);

        $this->postJson('/api/renders')->assertUnauthorized();
    }

    public function test_only_public_tool_calls_consume_the_mcp_render_limit(): void
    {
        config([
            'services.agent_api.mcp_rate_limit' => 1,
            'services.notion_image_renderer.url' => 'https://renderer.test',
        ]);
        Http::fake([
            'renderer.test/api/render' => Http::response('png-bytes', 200, [
                'Content-Type' => 'image/png',
                'X-Render-Format' => 'png',
                'X-Render-Width' => '256',
                'X-Render-Height' => '256',
            ]),
        ]);

        $payload = [
            'jsonrpc' => '2.0',
            'id' => 2,
            'method' => 'tools/call',
            'params' => [
                'name' => 'generate-notion-image',
                'arguments' => ['width' => 256, 'layout' => 'icon'],
            ],
        ];
        $request = $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.44'])
            ->withHeaders(['Accept' => 'application/json, text/event-stream']);

        $request->postJson('/mcp/notion-images', $payload)->assertOk();
        $request->postJson('/mcp/notion-images', $payload)->assertTooManyRequests();
    }
}
