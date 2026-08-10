<?php

namespace App\Services;

final readonly class RenderedImage
{
    public function __construct(
        public string $contents,
        public string $mimeType,
        public string $format,
        public int $width,
        public int $height,
    ) {}
}
