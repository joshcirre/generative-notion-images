# Generative Designs

An isometric cover plotter. Feed it parameters, get a design — sized for a
Notion page header (2.5:1, 1500×600) but useful anywhere a wide banner is.

```sh
npm install
npm run dev
```

## How it works

Five **surfaces** draw onto one isometric grid, and everything downstream —
light, material, palette, projection, canvas, export — is shared between them.

- **Pattern** — a generative height field. Eight compositions shape it, five
  silhouettes carve it.
- **Letters** — typed block letters, or an abstract mark generated from the seed.
- **Image** — a local raster or SVG sampled into an extruded isometric mosaic.
- **Text** — the words themselves become the terrain profile. No letterforms.
- **Voice** — record from the microphone and the envelope becomes the terrain.

The panel is sized to the viewport and never scrolls. It lays out side by side
when the viewport has horizontal room — landscape and at least 640px — and
stacks otherwise, so a portrait phone or tablet puts the artwork on top and
scrolls only the controls. Value handles scrub under a finger as well as a
cursor.

Every generated design is a pure function of its parameters. The same seed
always returns the same image, which is why a URL and a CLI flag set can both
reproduce whatever you land on. Images uploaded in the editor are the deliberate
exception: they stay in the current browser tab and are not put in the URL.
Remote MCP callers may send bounded source-image bytes for one in-memory render.

| Composition | |
| --- | --- |
| `terrain` | rolling fbm landscape |
| `skyline` | city lots with streets between them |
| `waves` | interfering sine ridges |
| `islands` | sharp plateaus over open ground |
| `terraces` | hard stepped cliffs |
| `drift` | sparse scattered cubes |
| `rings` | concentric ripples from a center |
| `weave` | interlaced basket strips |

Shapes: `full`, `island`, `ridge`, `corner`, `vignette`. The last one is dense
at the edges and open in the middle, which is useful for framing a foreground.

## Block letters

Switch **Surface** to `letters`. A word runs along the grid in one of two
layouts:

- `grid` — the whole word follows a single grid axis, so it climbs or descends
  as a diagonal. This is the original tool's behaviour and the right one for a
  one- or two-letter page icon.
- `flat` — each glyph drops onto a shared screen baseline while staying
  isometric. Use this for wide wordmarks.

`run` picks whether it climbs (`rise`) or descends (`fall`). Text runs to 48
characters, so `flat` can fill a header with a whole phrase.

The canvas is set by **Format** — `Header` (2.5:1, Notion's cover ratio, exports
1500×600) or `Icon` (1:1, exports 512 / 1024 / 2048). Other ratios stay
reachable via `aspect` in the URL or on the CLI.

Set **Glyph** to `generated` and the mark comes from the seed instead of the
keyboard — mirrored or quarter-symmetric, on the same 5×7 grid, so you can
generate one and then finish it by hand.

Type a **single** character (or generate a mark) and a 5×7 block editor appears — click any block to
toggle it and build a custom glyph. It rides along in the URL, so a hand-drawn
mark is as shareable as everything else.

## Text and voice

Both reduce to the same thing: a **signal**, 48 values between 0 and 1 that
modulate the height field.

- **Text** derives its signal from the characters — letters climb through the
  alphabet, whitespace drops to the floor, punctuation spikes. The result is a
  readable trace of what you typed rather than a hash, so similar text lands on
  similar designs. The same words always give the same design.
- **Voice** records from the microphone, tracks loudness over time and resamples
  that envelope. The artwork moves while you speak, then freezes.

The signal is always **frozen into a parameter**, never read live at render
time. A recording becomes 48 URL-safe characters, so the CLI can rebuild an
audio-derived cover months later with no microphone and no audio file involved.
The audio itself is never stored.

`Trace` picks how the signal is read: `ridge` runs it left to right as a
profile, `bars` breaks that into columns, `radial` reads it outwards as rings.
`Band` sets how deep the ribbon is — without it the field would recede forever
and the trace would read as stripes rather than a silhouette. `Signal vs. noise`
crossfades between the chosen composition and the trace, so a waveform can
either replace the terrain or just ripple through it.

## Image mosaics

Switch **Surface** to `image`, then choose or drop an image. The browser decodes
and downsamples it locally; no request, storage bucket, or server is involved.
The sampled pixels disappear when the tab is reloaded. Public MCP can accept
source bytes for a single in-memory render without storing them. A bucket is
only needed later if originals or generated output must persist at a stable URL.

Each included source pixel becomes an extruded isometric block. **Resolution**
sets the sample along the image's longest edge, **Threshold** removes weak
pixels, **Depth** controls the extrusion, and the normal palette maps source
shade onto the block faces. `Auto` reads alpha for transparent artwork and edge
contrast for opaque images; `Alpha`, `Dark`, and `Light` let you select the mask
explicitly. `Invert` flips that selection.

Choose the `dither` palette for a pixelated or terminal-print treatment. It
uses a stable 4×4 ordered pattern to alternate each isometric block between the
nearest color stops. The image's tonal structure survives, but broad gradients
become discrete clusters instead of smooth color interpolation.

## Background layers

The Canvas rack can put a `grid`, a generative `pattern`, or `both` behind the
selected surface. This is especially useful with **Letters**: the word remains
the foreground artwork while a lower-relief version of the normal pattern
language frames it from the outskirts.

The background pattern has its own composition and seed, so it can be tuned or
shuffled without changing the letters. Scale, height, density, detail, warp,
edge reach, and opacity keep it subordinate to the foreground. Edge reach
controls how far the blocks travel inward; the center is always cleared by the
background field's perimeter falloff.

The grid uses two line families. Size controls their spacing, Direction rotates
the first family, and Skew controls the angle to the second. Opacity, fade
direction, and directional fade can create anything from an even drafting grid
to lines that emerge from one side of a cover. Grid color is independent of the
artwork palette.

## Parameters

Grouped the way the panel groups them.

- **Type** (letters) — glyph source, text or symmetry/density, baseline, run,
  depth, tracking, fit, custom glyph
- **Image** — local file, read channel, resolution, threshold, invert, depth,
  run, fit
- **Text / Voice** — source text or recording, trace mode, band, smoothing,
  height, signal vs. noise, grid, coverage
- **Field** (pattern) — composition, shape, seed, grid, height, coverage,
  detail, octaves, warp (domain warping), jitter, steps (height quantization),
  floaters
- **Form & material** — tilt (isometric angle), stretch, gap, seam width and
  style (`cut` / `light` / `dark` / `none`), occlusion, bevel
- **Color** — 12 ramps, palette mode (`ramp` / `duotone` / `banded` / `dither` / `scatter`),
  ground / mid / peak stops, ramp curve, hue drift, saturation, light angle,
  face contrast
- **Filters** — noise, refracted glass and glass scale, soft vignette, edge blur
- **Canvas** — format (header / icon), zoom, backdrop mode and gradient angle,
  background layer (`none` / `grid` / `pattern` / `both`), edge-pattern controls,
  skewable/fadeable grid, inset, frame, nudge

**Zoom** scales the canvas over the artwork rather than the artwork itself: the
blocks keep their world size, so pulling back reveals more and smaller ones and
pushing in leaves fewer and bigger ones. Scroll or pinch over the artwork, or
use the `Zoom` field; `Reset view` puts zoom and both nudges back. It applies to
every surface — on `letters` it crops into the wordmark past what `fit` allows,
and on a trace it magnifies the waveform around its own centre line.

A field keeps generating to fill whatever canvas it is given, so pulling back
costs a column of polygons per cell revealed. Zoom's floor therefore rises with
`grid`, capping the canvas at 40 blocks across its height — past that the blocks
are thinner than the seams between them anyway. `letters` draws a fixed set of
blocks however far out you stand, so it gets the full 25–400% range.

`Shuffle everything` rolls a whole design. It starts from the composition's own
preset and wanders around it rather than rolling every knob uniformly, so the
results look deliberate instead of noisy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `public/` |
| `npm run check` | Type-check |
| `npm test` | Verify server-side SVG and PNG rendering |
| `npm run test:e2e` | Boot Laravel and Node and render through both over HTTP |
| `npm run generate` | Render designs from the command line |

## Agent API and Laravel MCP

`api/` contains a separate Laravel application that exposes the generator to
remote agents without rewriting the TypeScript scene engine. It provides:

- `POST /api/renders` for authenticated REST rendering.
- Public, no-auth `/mcp/notion-images` with a `generate-notion-image` MCP tool.
- Agent-friendly letter layouts, background layers, and color presets plus full
  parameter overrides.
- In-memory source-image mosaics and normalized audio-envelope terrain for
  multimodal agents; source media is never persisted.
- PNG or SVG content returned directly to the caller; storage is optional.

Laravel calls the root Node application's protected `POST /api/render`
endpoint. See [`api/README.md`](api/README.md) for local setup, request fields,
MCP configuration, and Laravel Cloud deployment.

## Deploying

The repository deploys as two independent Laravel Cloud applications. The root
Node application serves the editor and rendering endpoint; the `/api` root is
the Laravel REST/MCP gateway. Both applications can use the same repository and
deploy independently.

Cloud boots the root application with `npm start` and puts nginx in front.
`server.js` listens on `$PORT`, serves the build in `public/`, and loads the
precompiled renderer from `runtime/`. Runtime dependencies are limited to the
native SVG-to-PNG and source-image decoders; Vite and TypeScript remain
development-only.

Two things keep it from dying quietly behind the proxy:

- **It binds dual-stack.** `0.0.0.0` listens on IPv4 only, so a health probe to
  `localhost:$PORT` that resolves to `::1` is refused — the app looks healthy in
  its own logs and gets SIGTERMed anyway. No host is passed, so Node binds `::`.
- **Signals.** Node terminates on `SIGHUP` and `SIGUSR2` by default. Both are
  ignored; only `SIGTERM` and `SIGINT` shut the server down.
- **A missing build answers 503** rather than exiting. Exiting would crash-loop
  and report only as "app crashing", with the actual reason nowhere visible.

The root application's build command is `npm ci --audit false && npm run build`;
no deploy command is needed. Set `RENDER_API_TOKEN` in production. `PORT`,
`HOST`, `STATIC_ROOT`, and `RENDER_MODULE` are overridable.

Create the Laravel Cloud API application from the same repository with `/api`
as its root directory. Configure `AGENT_API_TOKEN`, `AGENT_RATE_LIMIT`, `MCP_RATE_LIMIT`,
`RENDERER_URL`, and `RENDERER_TOKEN`; the last value must match the generator's
`RENDER_API_TOKEN`. `AGENT_API_TOKEN` protects REST only; public MCP callers do
not need it.

## Generating outside the browser

The panel's bottom status bar shows the current design as a URL and as a CLI
command. The CLI runs the same engine:

```sh
npm run generate -- --png --seed 42
npm run generate -- --random --count 20 --png --out covers/
npm run generate -- --params "mode=weave&grid=13&stretch=150&tilt=22"
npm run generate -- --mode islands --zoom 45 --png
npm run generate -- --surface letters --text DEVREL --baseline flat --png \
  --backgroundLayer pattern --backgroundPatternMode terrain \
  --backgroundPatternSeed 42 --backgroundPatternReach 30
npm run generate -- --surface letters --glyphSource generated --aspect 1 --png
npm run generate -- --surface text --text "DevRel Home" --coverage 100 --png
```

SVG output has no external dependencies. `--png` shells out to headless Chrome
(set `CHROME_PATH` if it isn't in a standard location). `npm run generate --
--help` lists every flag; any scene parameter can be passed directly.

## Credits

Generator inspired by **Will King**'s
([@wking-io](https://github.com/wking-io))
[Patterns for Creativity](https://github.com/wking-io/patterns-for-creativity)
— an interactive presentation built for Laracon 2026.

The synth device in that deck is where the chassis, the opposing bevels, the
fractal-noise texture, the inset screen under its glare, the drag-scrubbable
value fields, and the `[-] [+]` bracket sliders all come from. The stack here
follows his too: Vite, React, and Tailwind. Go look at the original — it is a
far more impressive piece of work than this.

The palette is Laravel's, lifted from `laravel.com/resources/css/app.css`: the
sand scale for the chassis, and `--color-laravel-red` (`#f53003`) reserved for
buttons, selected states and focus — the way the site itself uses it. The same
brand reds are available as the `Laravel` artwork ramp, which is the default.

`legacy/` holds the original single-file block-letter tool. Its behaviour now
lives in the `letters` surface; the file is kept only for reference and still
opens directly in a browser.
