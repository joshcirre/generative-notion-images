<?php

namespace App\Http\Requests;

use App\Support\RenderInput;
use Illuminate\Foundation\Http\FormRequest;

class RenderImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return RenderInput::rules();
    }
}
