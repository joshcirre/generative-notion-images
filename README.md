# Generative Designs

An isometric cover plotter. Feed it parameters, get a design — sized for a
Notion page header (2.5:1, 1500×600) but useful anywhere a wide banner is.

```sh
npm install
npm run dev
```

## How it works

Four **surfaces** draw onto one isometric grid, and everything downstream —
light, material, palette, projection, canvas, export — is shared between them.

- **Pattern** — a generative height field. Eight compositions shape it, five
  silhouettes carve it.
- **Letters** — typed block letters, or an abstract mark generated from the seed.
- **Text** — the words themselves become the terrain profile. No letterforms.
- **Voice** — record from the microphone and the envelope becomes the terrain.

The panel is sized to the viewport and never scrolls.

Every design is a pure function of its parameters. The same seed always returns
the same image, which is why a URL and a CLI flag set can both reproduce
whatever you land on.

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
at the edges and open in the middle, so a page title has somewhere to sit.

## Block letters

Switch **Surface** to `letters`. A word runs along the grid in one of two
layouts:

- `grid` — the whole word follows a single grid axis, so it climbs or descends
  as a diagonal. This is the original tool's behaviour and the right one for a
  one- or two-letter page icon.
- `flat` — each glyph drops onto a shared screen baseline while staying
  isometric. Use this for wide wordmarks.

`run` picks whether it climbs (`rise`) or descends (`fall`). Set the canvas
aspect to 1:1 for an icon and the exports switch to 512 / 1024 / 2048.

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

## Parameters

Grouped the way the panel groups them.

- **Type** (letters) — glyph source, text or symmetry/density, baseline, run,
  depth, tracking, fit, custom glyph
- **Text / Voice** — source text or recording, trace mode, band, smoothing,
  height, signal vs. noise, grid, coverage
- **Field** (pattern) — composition, shape, seed, grid, height, coverage,
  detail, octaves, warp (domain warping), jitter, steps (height quantization),
  floaters
- **Form & material** — tilt (isometric angle), stretch, gap, seam width and
  style (`cut` / `light` / `dark` / `none`), occlusion, bevel, grain
- **Color** — 12 ramps, palette mode (`ramp` / `duotone` / `banded` / `scatter`),
  ground / mid / peak stops, ramp curve, hue drift, saturation, light angle,
  face contrast
- **Canvas** — aspect, backdrop mode and gradient angle, inset, frame, nudge

`Shuffle everything` rolls a whole design. It starts from the composition's own
preset and wanders around it rather than rolling every knob uniformly, so the
results look deliberate instead of noisy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `public/` |
| `npm run check` | Type-check |
| `npm run generate` | Render designs from the command line |

## Deploying

The app is a static SPA, but Laravel Cloud only deploys PHP applications — it
serves a `public/` document root and boots PHP, with no static-site or Node
process type. So the build targets `public/`, and `static/index.php` is copied
in beside it to answer anything that isn't a built asset with the SPA shell.

Vite empties `public/` on every build, which is why the PHP file lives in
`static/` (Vite's `publicDir`) rather than in `public/` itself.

Cloud's build command is `npm ci --audit false && npm run build`; no deploy
command is needed.

## Generating outside the browser

The panel's bottom status bar shows the current design as a URL and as a CLI
command. The CLI runs the same engine:

```sh
npm run generate -- --png --seed 42
npm run generate -- --random --count 20 --png --out covers/
npm run generate -- --params "mode=weave&grid=13&stretch=150&tilt=22"
npm run generate -- --surface letters --text DEVREL --baseline flat --png
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
