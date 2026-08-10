<?php

use App\Http\Controllers\RenderImageController;
use App\Http\Middleware\RequireAgentToken;
use Illuminate\Support\Facades\Route;

Route::post('/renders', RenderImageController::class)
    ->middleware([RequireAgentToken::class, 'throttle:agent-renders'])
    ->name('renders.store');
