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

Route::redirect('/favicon.ico', 'https://notion-images.laravel.cloud/generative-design-ico.png');
Route::redirect('/generative-design-ico.svg', 'https://notion-images.laravel.cloud/generative-design-ico.svg');

Route::get('/mcp/renders/{payload}', DownloadMcpRenderController::class)
    ->middleware(['signed:relative', 'throttle:public-mcp-downloads'])
    ->name('mcp-renders.download');
