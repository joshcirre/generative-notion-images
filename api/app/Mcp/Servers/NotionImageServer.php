<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\GenerateNotionImageTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Notion Image Server')]
#[Version('1.0.0')]
#[Instructions('This is a public, no-auth image generator. Turn the user’s visual prompt into reproducible parameters and call generate-notion-image. For letter headers, provide text, use the header layout, and choose pattern or both as the background. For an attached image, pass its base64 bytes as image_data; dither is a useful palette_mode. For audio, extract normalized loudness samples and pass audio_envelope; the audio itself is never stored. Change background_seed to shuffle only the edge pattern. Use params for advanced renderer controls. The tool returns preview_url, download_url, and editor_url when available. Always embed preview_url using Markdown image syntax and include the download and editor links in the final response so the user can see the preview, retrieve the full-resolution image, and continue editing it.')]
class NotionImageServer extends Server
{
    protected array $tools = [
        GenerateNotionImageTool::class,
    ];

    protected array $resources = [
        //
    ];

    protected array $prompts = [
        //
    ];
}
