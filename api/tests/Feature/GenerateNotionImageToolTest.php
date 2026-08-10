<?php

namespace Tests\Feature;

use App\Mcp\Servers\NotionImageServer;
use App\Mcp\Tools\GenerateNotionImageTool;
use App\Support\RenderInput;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
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
                'X-Render-Width' => '224',
                'X-Render-Height' => '224',
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
                ->where('preview_width', 224)
                ->where('preview_height', 224)
                ->where('params.surface', 'letters')
                ->where('params.text', 'ARCH')
                ->where('params.baseline', 'grid')
                ->where('params.aspect', 1)
                ->where('params.seed', 9)
                ->where('params.backgroundLayer', 'pattern')
                ->where('params.backgroundPatternMode', 'drift')
                ->where('params.backgroundPatternSeed', 73)
                ->whereType('preview_url', 'string')
                ->whereType('download_url', 'string')
                ->where('editor_url', fn (string $url): bool => str_starts_with($url, 'https://notion-images.laravel.cloud/#'))
                ->etc());

        Http::assertSent(fn (HttpRequest $request): bool => $request['width'] === 224
            && $request['format'] === 'png'
            && $request['compact'] === true);
    }

    public function test_source_image_and_audio_inputs_are_mutually_exclusive(): void
    {
        $input = [
            'image_data' => 'aW1hZ2U=',
            'audio_envelope' => [0, 1],
        ];
        $validator = Validator::make($input, RenderInput::rules());

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('image_data'));
        $this->assertTrue($validator->errors()->has('audio_envelope'));
        NotionImageServer::tool(GenerateNotionImageTool::class, $input)->assertHasErrors();
    }
}
