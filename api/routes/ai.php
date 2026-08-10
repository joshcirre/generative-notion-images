<?php

use App\Mcp\Servers\NotionImageServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp/notion-images', NotionImageServer::class)
    ->middleware(['throttle:public-mcp-renders']);
