<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAgentToken
{
    /**
     * Protect both the REST and remote MCP surfaces with one simple token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.agent_api.token', '');

        if ($expected === '') {
            if (app()->environment(['local', 'testing'])) {
                return $next($request);
            }

            return response()->json(['message' => 'AGENT_API_TOKEN is not configured.'], 503);
        }

        if (! hash_equals($expected, (string) $request->bearerToken())) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
