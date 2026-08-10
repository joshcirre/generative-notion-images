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
    }
}
