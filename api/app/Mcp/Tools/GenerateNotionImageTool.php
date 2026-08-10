<?php

namespace App\Mcp\Tools;

use App\Services\NotionImageRenderer;
use App\Services\RendererException;
use App\Services\RenderRequestFactory;
use App\Support\RenderInput;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;

#[Description('Generate a PNG or SVG Notion cover or icon from reproducible isometric design parameters.')]
class GenerateNotionImageTool extends Tool
{
    /**
     * Handle the tool request.
     */
    public function handle(
        Request $request,
        RenderRequestFactory $factory,
        NotionImageRenderer $renderer,
    ): ResponseFactory {
        $input = $request->validate(RenderInput::rules());
        $payload = $factory->make($input);
        try {
            $image = $renderer->render($payload);
        } catch (RendererException $exception) {
            return Response::make(Response::error($exception->getMessage()));
        }
        $metadata = [
            'format' => $image->format,
            'mime_type' => $image->mimeType,
            'width' => $image->width,
            'height' => $image->height,
            'params' => $payload['params'],
        ];

        return Response::make([
            Response::image($image->contents, $image->mimeType),
            Response::text("Generated a {$image->width}×{$image->height} {$image->format} Notion image."),
        ])->withStructuredContent($metadata);
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'format' => $schema->string()->enum(RenderInput::FORMATS)->default('png')
                ->description('Output format. PNG is best for direct use in Notion.'),
            'width' => $schema->integer()->min(128)->max(4096)->default(1500)
                ->description('Output width in pixels. Height follows the scene aspect ratio.'),
            'text' => $schema->string()->max(48)
                ->description('Text built from isometric blocks. Use the header layout for a wide wordmark.'),
            'layout' => $schema->string()->enum(RenderInput::LAYOUTS)->default('header')
                ->description('Header makes flat letters, diagonal follows the grid, icon is square, and pattern omits letters.'),
            'palette_preset' => $schema->string()->enum(RenderInput::PALETTES)->default('laravel')
                ->description('Coordinated artwork and background color preset.'),
            'surface' => $schema->string()->enum(RenderInput::SURFACES)->default('letters')
                ->description('The generator surface. Uploaded image mosaics remain browser-local.'),
            'mode' => $schema->string()->enum(RenderInput::MODES)->default('terrain'),
            'shape' => $schema->string()->enum(RenderInput::SHAPES)->default('full'),
            'seed' => $schema->integer()->min(1)->max(1000000000)->default(1)
                ->description('Reproducible variation seed.'),
            'aspect' => $schema->number()->min(1)->max(6)->default(2.5)
                ->description('Canvas width divided by height. Notion covers default to 2.5; icons use 1.'),
            'background' => $schema->string()->enum(RenderInput::BACKGROUNDS)->default('none')
                ->description('Independent canvas layer behind the surface: drafting grid, sparse edge pattern, or both.'),
            'background_mode' => $schema->string()->enum(RenderInput::MODES)->default('terrain')
                ->description('Composition used by the sparse edge pattern.'),
            'background_seed' => $schema->integer()->min(1)->max(1000000000)->default(17)
                ->description('Shuffle this seed to change only the background pattern.'),
            'background_scale' => $schema->integer()->min(4)->max(26)->default(12)
                ->description('Number of background pattern cells across the canvas height.'),
            'background_height' => $schema->integer()->min(1)->max(8)->default(2)
                ->description('Maximum height of the background blocks.'),
            'background_density' => $schema->number()->min(0)->max(100)->default(44)
                ->description('How many background blocks survive the field threshold.'),
            'background_detail' => $schema->number()->min(1)->max(100)->default(38)
                ->description('Noise frequency inside the background pattern.'),
            'background_warp' => $schema->number()->min(0)->max(100)->default(12)
                ->description('How strongly the background field bends.'),
            'background_reach' => $schema->number()->min(5)->max(85)->default(30)
                ->description('How far the edge pattern travels toward the clear center.'),
            'background_opacity' => $schema->number()->min(0)->max(100)->default(58)
                ->description('Opacity of the background blocks without fading the foreground.'),
            'params' => $schema->object()
                ->description('Advanced renderer parameter overrides using names from the generator URL and AGENTS.md.'),
        ];
    }
}
