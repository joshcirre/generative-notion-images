<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('agent-renders', function (Request $request): Limit {
            $identity = $request->bearerToken() ?: $request->ip();

            return Limit::perMinute((int) config('services.agent_api.rate_limit', 30))
                ->by(hash('sha256', (string) $identity));
        });

        RateLimiter::for('public-mcp-renders', function (Request $request): Limit {
            if ($request->input('method') !== 'tools/call'
                || $request->input('params.name') !== 'generate-notion-image') {
                return Limit::none();
            }

            return Limit::perMinute((int) config('services.agent_api.mcp_rate_limit', 10))
                ->by(hash('sha256', (string) $request->ip()));
        });

        RateLimiter::for('public-mcp-downloads', function (Request $request): Limit {
            return Limit::perMinute((int) config('services.agent_api.mcp_rate_limit', 10))
                ->by(hash('sha256', (string) $request->ip()));
        });
    }
}
