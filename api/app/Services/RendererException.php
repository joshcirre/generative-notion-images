<?php

namespace App\Services;

use RuntimeException;
use Throwable;

class RendererException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 502,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
