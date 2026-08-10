<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Notion Image API',
        'rest' => '/api/renders',
        'mcp' => '/mcp/notion-images',
    ]);
});
