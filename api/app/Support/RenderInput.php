<?php

namespace App\Support;

use Illuminate\Validation\Rule;

final class RenderInput
{
    public const FORMATS = ['png', 'svg'];

    public const SURFACES = ['pattern', 'letters', 'image', 'text', 'voice'];

    public const MODES = ['terrain', 'skyline', 'waves', 'islands', 'terraces', 'drift', 'rings', 'weave'];

    public const SHAPES = ['full', 'island', 'ridge', 'corner', 'vignette'];

    public const LAYOUTS = ['header', 'diagonal', 'icon', 'pattern'];

    public const BACKGROUNDS = ['none', 'grid', 'pattern', 'both'];

    public const PALETTES = ['laravel', 'ocean', 'forest', 'slate'];

    public const PALETTE_MODES = ['ramp', 'duotone', 'banded', 'dither', 'scatter'];

    public const IMAGE_CHANNELS = ['auto', 'alpha', 'dark', 'light'];

    /** @return array<string, mixed> */
    public static function rules(): array
    {
        return [
            'format' => ['sometimes', Rule::in(self::FORMATS)],
            'width' => ['sometimes', 'integer', 'between:128,4096'],
            'text' => ['sometimes', 'string', 'max:48'],
            'surface' => ['sometimes', Rule::in(self::SURFACES)],
            'mode' => ['sometimes', Rule::in(self::MODES)],
            'shape' => ['sometimes', Rule::in(self::SHAPES)],
            'seed' => ['sometimes', 'integer', 'between:1,1000000000'],
            'aspect' => ['sometimes', 'numeric', 'between:1,6'],
            'layout' => ['sometimes', Rule::in(self::LAYOUTS)],
            'palette_preset' => ['sometimes', Rule::in(self::PALETTES)],
            'palette_mode' => ['sometimes', Rule::in(self::PALETTE_MODES)],
            'image_data' => ['sometimes', 'string', 'max:2800000', 'prohibits:audio_envelope'],
            'image_channel' => ['sometimes', Rule::in(self::IMAGE_CHANNELS)],
            'image_resolution' => ['sometimes', 'integer', 'between:8,48'],
            'image_threshold' => ['sometimes', 'numeric', 'between:0,100'],
            'image_invert' => ['sometimes', 'boolean'],
            'audio_envelope' => ['sometimes', 'array', 'between:2,512', 'prohibits:image_data'],
            'audio_envelope.*' => ['numeric', 'between:0,1'],
            'background' => ['sometimes', Rule::in(self::BACKGROUNDS)],
            'background_mode' => ['sometimes', Rule::in(self::MODES)],
            'background_seed' => ['sometimes', 'integer', 'between:1,1000000000'],
            'background_scale' => ['sometimes', 'integer', 'between:4,26'],
            'background_height' => ['sometimes', 'integer', 'between:1,8'],
            'background_density' => ['sometimes', 'numeric', 'between:0,100'],
            'background_detail' => ['sometimes', 'numeric', 'between:1,100'],
            'background_warp' => ['sometimes', 'numeric', 'between:0,100'],
            'background_reach' => ['sometimes', 'numeric', 'between:5,85'],
            'background_opacity' => ['sometimes', 'numeric', 'between:0,100'],
            'params' => ['sometimes', 'array'],
            // Fail loudly for the short-lived overlay API instead of silently
            // returning an image that omits the caller's requested content.
            'title' => ['prohibited'],
            'ornaments' => ['prohibited'],
            'grid' => ['prohibited'],
        ];
    }

    /** @return array<string, mixed> */
    public static function publicMcpRules(): array
    {
        return [
            ...self::rules(),
            // Public MCP output is intentionally capped below the authenticated
            // REST ceiling to bound CPU, memory, and response size per request.
            'width' => ['sometimes', 'integer', 'between:128,2048'],
        ];
    }
}
