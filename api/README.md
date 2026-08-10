# Notion Image API

Laravel REST and MCP gateway for the existing Node-based Generative Designs
renderer. It gives remote agents a small, validated interface without moving or
duplicating the TypeScript scene engine.

## Request flow

```text
Agent or API client
  → public MCP or token-authenticated REST
  → agent-friendly parameter translation
  → protected Node POST /api/render
  → PNG or SVG returned to the caller
```

The MCP tool returns image content directly, so storage is not required. Add a
Laravel Cloud bucket later when generated files need stable URLs, history, or
direct Notion attachment.

## Local setup

The Node renderer and Laravel gateway run as two processes.

From the repository root:

```sh
npm install
npm run build
RENDER_API_TOKEN=renderer-secret PORT=8080 npm start
```

In another terminal:

```sh
cd api
composer install
cp .env.example .env
php artisan key:generate
```

Configure these values in `api/.env`:

```dotenv
AGENT_API_TOKEN=agent-secret
AGENT_RATE_LIMIT=30
MCP_RATE_LIMIT=10
RENDERER_URL=http://127.0.0.1:8080
RENDERER_TOKEN=renderer-secret
```

Then start Laravel:

```sh
php artisan serve
```

## REST API

Generate an image with `POST /api/renders`. The response body is the requested
PNG or SVG, with its dimensions in `X-Render-Width` and `X-Render-Height`.

```sh
curl --request POST http://127.0.0.1:8000/api/renders \
  --header 'Authorization: Bearer agent-secret' \
  --header 'Content-Type: application/json' \
  --output cover.png \
  --data '{
    "text": "PLATFORM",
    "layout": "header",
    "palette_preset": "ocean",
    "background": "both",
    "background_mode": "islands",
    "background_seed": 91,
    "background_reach": 26,
    "seed": 42,
    "params": { "run": "fall" }
  }'
```

### Request fields

| Field | Values | Default |
| --- | --- | --- |
| `format` | `png`, `svg` | `png` |
| `width` | 128–4096 | 1500 |
| `text` | Up to 48 characters built from blocks | `DR` |
| `layout` | `header`, `diagonal`, `icon`, `pattern` | `header` |
| `palette_preset` | `laravel`, `ocean`, `forest`, `slate` | `laravel` |
| `palette_mode` | `ramp`, `duotone`, `banded`, `dither`, `scatter` | `ramp` |
| `surface` | `pattern`, `letters`, `image`, `text`, `voice` | layout-controlled |
| `image_data` | Raw base64 or base64 `data:image` URL; 2 MB decoded maximum | none |
| `image_channel` | `auto`, `alpha`, `dark`, `light` | `auto` |
| `image_resolution` | 8–48 cells along the longest edge | 28 |
| `image_threshold` | 0–100 | 10 |
| `image_invert` | boolean | `false` |
| `audio_envelope` | 2–512 normalized loudness values from 0–1 | none |
| `mode` | Any generator composition | `terrain` |
| `shape` | Any generator silhouette | `full` |
| `seed` | 1–1,000,000,000 | 1 |
| `aspect` | 1–6 | 2.5 |
| `background` | `none`, `grid`, `pattern`, `both` | `none` |
| `background_mode` | Any generator composition | `terrain` |
| `background_seed` | 1–1,000,000,000 | 17 |
| `background_scale` | 4–26 cells across canvas height | 12 |
| `background_height` | 1–8 blocks | 2 |
| `background_density` | 0–100 | 44 |
| `background_detail` | 1–100 | 38 |
| `background_warp` | 0–100 | 12 |
| `background_reach` | 5–85 | 30 |
| `background_opacity` | 0–100 | 58 |
| `params` | Advanced scene parameter overrides | empty |

`header`, `diagonal`, and `icon` all produce the LETTERS surface. `pattern`
produces a standalone field. Values in `params` override every convenience
setting, using the camelCase names from `src/scene/types.ts`.

The removed `title`, `ornaments`, and boolean `grid` fields return a validation
error. Use `text` for isometric letterforms and `background` for independent
grid or edge-pattern layers.

## MCP

The remote MCP endpoint is public and requires no account, token, or custom
headers:

```text
POST /mcp/notion-images
```

It exposes one tool:

```text
generate-notion-image
```

The agent translates ordinary visual direction into the tool's design fields.
An attached PNG, JPEG, WebP, or SVG can be sent as `image_data` for a true
shade-to-isometric mosaic. The source is limited, decoded in memory, and never
stored. For audio, the agent sends a normalized `audio_envelope`; the API
resamples it into a compact reproducible voice signal and discards the source.

Public MCP output is capped at 2048px and rendering calls are limited per IP.
Protocol initialization and tool discovery do not consume the render limit.

The result contains:

- The PNG or SVG as MCP image content.
- A short human-readable confirmation.
- Structured metadata with format, dimensions, and resolved renderer params.

Use Laravel's MCP inspector locally:

```sh
php artisan mcp:inspector mcp/notion-images
```

## Laravel Cloud

Create two Cloud applications from the same repository:

| Application | Root | Runtime responsibility |
| --- | --- | --- |
| Generator | `/` | React editor and protected Node rendering |
| API | `/api` | Laravel REST/MCP gateway |

Generator environment variables:

```dotenv
NODE_ENV=production
RENDER_API_TOKEN=<shared-renderer-secret>
```

API environment variables:

```dotenv
APP_ENV=production
APP_DEBUG=false
AGENT_API_TOKEN=<agent-facing-secret>
AGENT_RATE_LIMIT=30
MCP_RATE_LIMIT=10
RENDERER_URL=https://<generator-domain>
RENDERER_TOKEN=<shared-renderer-secret>
RENDERER_TIMEOUT=30
```

`AGENT_API_TOKEN` protects the optional REST surface. MCP is public, but its
rendering rate is limited per IP. `RENDERER_TOKEN` remains private and must
match the generator's `RENDER_API_TOKEN`. Both applications should run in the
same Cloud region. The default file cache works for one API instance; set
`CACHE_STORE=redis` when rate limits must be shared across multiple instances.

## Verification

```sh
# Repository root
npm run check
npm test
npm run build

# Laravel API
cd api
vendor/bin/pint --test
composer test
php artisan route:list

# Both applications, real HTTP, and a real PNG
cd ..
npm run test:e2e
```
