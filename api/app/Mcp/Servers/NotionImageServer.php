<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\GenerateNotionImageTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('Notion Image Server')]
#[Version('1.0.0')]
#[Instructions('Generate reproducible Notion covers and icons. For letter headers, provide text, use the header layout, and choose pattern or both as the background. Change background_seed to shuffle the edge pattern without changing the letters. Use params for advanced renderer controls.')]
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
