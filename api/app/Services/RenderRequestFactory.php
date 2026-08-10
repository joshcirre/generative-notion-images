<?php

namespace App\Services;

use Illuminate\Support\Arr;

class RenderRequestFactory
{
    private const LAYOUTS = [
        'header' => ['surface' => 'letters', 'baseline' => 'flat', 'aspect' => 2.5, 'fit' => 62],
        'diagonal' => ['surface' => 'letters', 'baseline' => 'grid', 'aspect' => 2.5, 'fit' => 62],
        'icon' => ['surface' => 'letters', 'baseline' => 'grid', 'aspect' => 1, 'fit' => 72],
        'pattern' => ['surface' => 'pattern', 'aspect' => 2.5],
    ];

    private const PALETTES = [
        'laravel' => ['colorA' => '#ec8f7a', 'colorMid' => '#f53003', 'colorB' => '#c42602', 'bg1' => '#fce9e5', 'bg2' => '#f2d9d3'],
        'ocean' => ['colorA' => '#79c8ee', 'colorMid' => '#2d7cb8', 'colorB' => '#0d3a6d', 'bg1' => '#e7f5fb', 'bg2' => '#dbe7f0'],
        'forest' => ['colorA' => '#95d68d', 'colorMid' => '#3f9455', 'colorB' => '#14532d', 'bg1' => '#eaf6e7', 'bg2' => '#dcebdd'],
        'slate' => ['colorA' => '#b3bfcc', 'colorMid' => '#5b6b7c', 'colorB' => '#1e2731', 'bg1' => '#edf0f3', 'bg2' => '#dfe4e8'],
    ];

    /**
     * Translate a small agent-friendly vocabulary into the renderer's Params.
     * Explicit advanced params win over every convenience setting.
     *
     * @param  array<string, mixed>  $input
     * @return array{format: string, width: int, params: array<string, mixed>}
     */
    public function make(array $input): array
    {
        $layout = self::LAYOUTS[$input['layout'] ?? 'header'] ?? [];
        $palette = self::PALETTES[$input['palette_preset'] ?? 'laravel'] ?? [];
        $params = [...$layout, ...$palette];

        foreach (['text', 'surface', 'mode', 'shape', 'seed', 'aspect'] as $key) {
            if (array_key_exists($key, $input)) {
                $params[$key] = $input[$key];
            }
        }

        $background = [
            'background' => 'backgroundLayer',
            'background_mode' => 'backgroundPatternMode',
            'background_seed' => 'backgroundPatternSeed',
            'background_scale' => 'backgroundPatternGrid',
            'background_height' => 'backgroundPatternHeight',
            'background_density' => 'backgroundPatternCoverage',
            'background_detail' => 'backgroundPatternDetail',
            'background_warp' => 'backgroundPatternWarp',
            'background_reach' => 'backgroundPatternReach',
            'background_opacity' => 'backgroundPatternOpacity',
        ];
        foreach ($background as $inputKey => $paramKey) {
            if (array_key_exists($inputKey, $input)) {
                $params[$paramKey] = $input[$inputKey];
            }
        }

        $params = [...$params, ...Arr::wrap($input['params'] ?? [])];

        return [
            'format' => $input['format'] ?? 'png',
            'width' => (int) ($input['width'] ?? ((float) ($params['aspect'] ?? 2.5) === 1.0 ? 1024 : 1500)),
            'params' => $params,
        ];
    }
}
