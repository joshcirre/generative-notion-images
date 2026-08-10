<?php

use App\Http\Middleware\RequireAgentToken;
use App\Mcp\Servers\NotionImageServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp/notion-images', NotionImageServer::class)
    ->middleware([RequireAgentToken::class, 'throttle:agent-renders']);
