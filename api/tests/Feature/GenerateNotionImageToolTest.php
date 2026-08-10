<?php

namespace Tests\Feature;

use App\Mcp\Servers\NotionImageServer;
use App\Mcp\Tools\GenerateNotionImageTool;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class GenerateNotionImageToolTest extends TestCase
{
    public function test_an_agent_can_generate_an_image_with_structured_metadata(): void
    {
        config([
            'services.notion_image_renderer.url' => 'https://renderer.test',
            'services.notion_image_renderer.token' => 'renderer-secret',
        ]);
        Http::fake([
            'renderer.test/api/render' => Http::response('png-bytes', 200, [
                'Content-Type' => 'image/png',
                'X-Render-Format' => 'png',
                'X-Render-Width' => '1024',
                'X-Render-Height' => '1024',
            ]),
        ]);

        NotionImageServer::tool(GenerateNotionImageTool::class, [
            'text' => 'ARCH',
            'layout' => 'icon',
            'width' => 1024,
            'seed' => 9,
            'background' => 'pattern',
            'background_mode' => 'drift',
            'background_seed' => 73,
        ])->assertOk()
            ->assertSee('Generated a 1024×1024 png Notion image.')
            ->assertStructuredContent(fn (AssertableJson $json) => $json
                ->where('format', 'png')
                ->where('width', 1024)
                ->where('height', 1024)
                ->where('params.surface', 'letters')
                ->where('params.text', 'ARCH')
                ->where('params.baseline', 'grid')
                ->where('params.aspect', 1)
                ->where('params.seed', 9)
                ->where('params.backgroundLayer', 'pattern')
                ->where('params.backgroundPatternMode', 'drift')
                ->where('params.backgroundPatternSeed', 73)
                ->etc());
    }
}
