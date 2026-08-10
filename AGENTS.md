# Agent guide — Generative Notion Images

Use this repository to create reproducible isometric Notion covers and icons.
Prefer the shared scene engine and CLI over hand-writing or editing SVG.

## Generate an image quickly

Install once:

```sh
npm install
```

Create a 1500×600 PNG in a temporary location:

```sh
npm run generate -- --png --out /tmp/notion-cover.png \
  --seed 42 --mode terrain --shape vignette \
  --title "Platform Notes" --titleAlign left --titleX 12 --titleY 50 \
  --gridOverlay 1 --gridAngle 30 --gridSkew 120 --gridFade 80 \
  --ornaments perimeter --ornamentCount 8
```

Inspect the PNG before handing it off. Iterate by changing parameters, not the
generated file. Put final output wherever the user requested. Do not commit
generated exports unless asked.

## What can be generated

The scene has five surfaces:

- `pattern`: generated terrain, skyline, waves, islands, terraces, drift,
  rings, or weave.
- `letters`: typed 5×7 block letters or a seeded abstract mark.
- `image`: a browser-local upload converted into an isometric mosaic. This
  surface is not available from the CLI because the source pixels are not part
  of scene parameters.
- `text`: typed words converted into a terrain signal.
- `voice`: a recorded envelope converted into a terrain signal. Existing
  encoded signals can render from the CLI.

Every surface shares color, material, canvas, title, symbols, and background
grid controls. The generated SVG is self-contained except for the generic font
family used by optional title text.

## Useful recipes

Square page icon:

```sh
npm run generate -- --png --width 1024 --out /tmp/notion-icon.png \
  --surface letters --glyphSource generated --aspect 1 --seed 18 \
  --depth 3 --fit 72 --ornaments perimeter --ornamentCount 5
```

Wide wordmark:

```sh
npm run generate -- --png --out /tmp/wordmark.png \
  --surface letters --text "DEVREL" --baseline flat --run rise \
  --tracking 1 --fit 62 --gridOverlay 1 --gridOpacity 14
```

Blocks on the right with open title space on the left:

```sh
npm run generate -- --png --out /tmp/right-weighted.png \
  --mode terrain --shape corner --shiftX 34 --zoom 120 --seed 27 \
  --title "Release Planning" --titleAlign left --titleX 8 \
  --gridOverlay 1 --gridAngle 30 --gridSkew 120 --gridFadeAngle 0
```

Generate a batch of candidates:

```sh
npm run generate -- --random --count 12 --png --out /tmp/notion-candidates
```

Rebuild a design copied from the app's URL:

```sh
npm run generate -- --png --out /tmp/from-app.png \
  --params "mode=weave&seed=7&gridOverlay=1&title=Architecture"
```

Drop `--png` to write SVG. Use `--width N` to choose output width; height follows
`aspect`. Header defaults are `aspect=2.5` and `width=1500`. Square icons use
`aspect=1` and commonly `width=512`, `1024`, or `2048`.

## High-value parameters

| Goal | Parameters |
| --- | --- |
| Composition | `surface`, `mode`, `shape`, `seed`, `grid`, `height`, `coverage` |
| Open title space | `shape=vignette` or `shape=corner`, then `shiftX` / `shiftY` |
| Block geometry | `tilt`, `stretch`, `gap`, `depth`, `seam`, `seamStyle` |
| Material | `occlusion`, `bevel`, `grain`, `light`, `contrast` |
| Color | `palette`, `colorA`, `colorMid`, `colorB`, `useMid`, `bg1`, `bg2` |
| Header text | `title`, `titleX`, `titleY`, `titleSize`, `titleAlign`, `titleColor`, `titleTracking` |
| Generated symbols | `ornaments=perimeter|background`, `ornamentCount`, `ornamentSize`, `ornamentOpacity`, `ornamentColor` |
| Drafting grid | `gridOverlay=1`, `gridSpacing`, `gridAngle`, `gridSkew`, `gridOpacity`, `gridFade`, `gridFadeAngle`, `gridColor` |
| Canvas | `aspect`, `zoom`, `shiftX`, `shiftY`, `backdrop`, `inset`, `frame` |

Use `npm run generate -- --help` for every accepted parameter. The URL and CLI
use the same names as `Params` in `src/scene/types.ts`.

## Browser-local image mosaics

Run `npm run dev`, choose the **Image** surface, and drop a PNG, JPG, WebP, or
SVG into the panel. Tune `imageChannel`, `imageResolution`, `imageThreshold`,
`imageInvert`, `depth`, and `fit`, then export from the browser.

The image never uploads. A Laravel Cloud bucket is only needed if the user asks
for persistence, sharing, or server/CLI rendering of uploaded images. Do not add
storage for ordinary local conversion.

## Changing the generator

- Add scene parameters to `src/scene/types.ts`, including defaults, limits,
  string keys, and enums where applicable.
- Normalize integer and boolean-like values in `src/scene/params.ts`.
- Keep rendering in `src/scene/build.ts` so browser, SVG export, and CLI agree.
- Add controls in `src/ui/App.tsx` and reusable input behavior in
  `src/ui/controls.tsx`.
- Keep uploaded pixel data outside `Params`; URLs must remain compact and safe.
- Preserve old parameter defaults so existing shared URLs keep their appearance.

After changes, run:

```sh
npm run check
npm run build
```

Then generate and inspect at least one representative PNG. If scene parameters
changed, also confirm `npm run generate -- --help` lists them automatically.
