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

    public function test_image_data_selects_the_image_surface_and_stays_outside_params(): void
    {
        $payload = (new RenderRequestFactory)->make([
            'image_data' => 'aW1hZ2UtYnl0ZXM=',
            'image_channel' => 'dark',
            'image_resolution' => 32,
            'palette_mode' => 'dither',
        ]);

        $this->assertSame('image', $payload['params']['surface']);
        $this->assertSame('dark', $payload['params']['imageChannel']);
        $this->assertSame(32, $payload['params']['imageResolution']);
        $this->assertSame('dither', $payload['params']['palette']);
        $this->assertSame('aW1hZ2UtYnl0ZXM=', $payload['imageData']);
        $this->assertArrayNotHasKey('imageData', $payload['params']);
    }

    public function test_audio_envelope_becomes_a_frozen_voice_signal(): void
    {
        $payload = (new RenderRequestFactory)->make([
            'audio_envelope' => [0, 0.5, 1, 0.25],
        ]);

        $this->assertSame('voice', $payload['params']['surface']);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{48}$/', $payload['params']['signal']);
    }
}
