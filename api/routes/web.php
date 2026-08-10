<?php

use App\Http\Controllers\DownloadMcpRenderController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'Notion Image API',
        'rest' => '/api/renders',
        'mcp' => '/mcp/notion-images',
    ]);
});

Route::get('/favicon.ico', function () {
    return response()->file(base_path('../public/generative-design-ico.png'), [
        'Content-Type' => 'image/png',
        'Cache-Control' => 'public, max-age=86400',
    ]);
});

Route::get('/generative-design-ico.svg', function () {
    return response()->file(base_path('../public/generative-design-ico.svg'), [
        'Content-Type' => 'image/svg+xml',
        'Cache-Control' => 'public, max-age=86400',
    ]);
});

Route::get('/mcp/renders/{payload}', DownloadMcpRenderController::class)
    ->middleware(['signed:relative', 'throttle:public-mcp-downloads'])
    ->name('mcp-renders.download');
