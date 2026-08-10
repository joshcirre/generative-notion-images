<?php

namespace Tests\Unit;

use App\Services\RenderRequestFactory;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RenderRequestFactoryTest extends TestCase
{
    /** @return array<string, array{string, string, float}> */
    public static function layouts(): array
    {
        return [
            'header' => ['header', 'flat', 2.5],
            'diagonal' => ['diagonal', 'grid', 2.5],
            'icon' => ['icon', 'grid', 1.0],
        ];
    }

    #[DataProvider('layouts')]
    public function test_letter_layouts_are_agent_friendly(string $layout, string $baseline, float $aspect): void
    {
        $payload = (new RenderRequestFactory)->make(['layout' => $layout, 'text' => 'AGENT']);

        $this->assertSame('letters', $payload['params']['surface']);
        $this->assertSame('AGENT', $payload['params']['text']);
        $this->assertSame($baseline, $payload['params']['baseline']);
        $this->assertEquals($aspect, $payload['params']['aspect']);
    }

    public function test_advanced_params_override_convenience_controls(): void
    {
        $payload = (new RenderRequestFactory)->make([
            'background' => 'pattern',
            'background_reach' => 30,
            'params' => ['backgroundLayer' => 'both', 'backgroundPatternReach' => 18],
        ]);

        $this->assertSame('both', $payload['params']['backgroundLayer']);
        $this->assertSame(18, $payload['params']['backgroundPatternReach']);
    }
}
