// The full parameter surface of a generated design. Everything a scene needs
// lives here — the UI, the URL, and the CLI all speak this one shape.

// Long enough to fill a header with a phrase, not just a monogram.
export const MAX_TEXT = 48

export const SURFACES = ['pattern', 'letters', 'image', 'text', 'voice'] as const
export const RUNS = ['rise', 'fall'] as const
export const BASELINES = ['grid', 'flat'] as const
export const GLYPH_SOURCES = ['typed', 'generated'] as const
export const SYMMETRIES = ['none', 'mirror', 'quarter'] as const
export const SIGNAL_MODES = ['ridge', 'bars', 'radial'] as const
export const MODES = [
  'terrain', 'skyline', 'waves', 'islands', 'terraces', 'drift', 'rings', 'weave',
] as const
export const SHAPES = ['full', 'island', 'ridge', 'corner', 'vignette'] as const
export const PALETTES = ['ramp', 'duotone', 'banded', 'scatter'] as const
export const SEAMS = ['cut', 'light', 'dark', 'none'] as const
export const BACKDROPS = ['gradient', 'solid', 'none'] as const
export const BACKGROUND_LAYERS = ['none', 'grid', 'pattern', 'both'] as const
export const IMAGE_CHANNELS = ['auto', 'alpha', 'dark', 'light'] as const

export type Surface = (typeof SURFACES)[number]
export type Run = (typeof RUNS)[number]
export type Baseline = (typeof BASELINES)[number]
export type GlyphSource = (typeof GLYPH_SOURCES)[number]
export type Symmetry = (typeof SYMMETRIES)[number]
export type SignalMode = (typeof SIGNAL_MODES)[number]
export type Mode = (typeof MODES)[number]
export type Shape = (typeof SHAPES)[number]
export type Palette = (typeof PALETTES)[number]
export type SeamStyle = (typeof SEAMS)[number]
export type Backdrop = (typeof BACKDROPS)[number]
export type BackgroundLayer = (typeof BACKGROUND_LAYERS)[number]
export type ImageChannel = (typeof IMAGE_CHANNELS)[number]

/** A decoded image held in browser memory. It never enters Params or a URL. */
export type ImageSample = {
  width: number
  height: number
  rgba: Uint8ClampedArray
}

export type Params = {
  // which generator drives the design
  surface: Surface

  // signal-driven surfaces ('text' and 'voice')
  signal: string       // 48 frozen samples; empty means flat
  signalMode: SignalMode
  signalGain: number   // how far the signal overrides the composition's noise
  signalBand: number   // ribbon depth in cells — without this the field runs
                       // back forever and the trace reads as stripes, not a profile
  signalSmooth: number

  // letters (surface: 'letters')
  glyphSource: GlyphSource   // typed characters, or a mark generated from the seed
  glyphSymmetry: Symmetry
  glyphDensity: number
  text: string
  run: Run           // whether the word climbs or descends to the right
  baseline: Baseline // 'grid' runs the whole word along one axis (a diagonal,
                     // right for icons); 'flat' drops each glyph onto a shared
                     // screen baseline (right for wide wordmarks)
  depth: number      // how far each block extends back into the scene
  tracking: number   // extra cells between glyphs
  fit: number        // wordmark height as a % of the canvas
  custom: string     // 35-char 0/1 mask overriding a single glyph, '' = off

  // uploaded image (surface: 'image'). The pixels themselves stay outside the
  // parameter object; these knobs describe how that temporary source is read.
  imageChannel: ImageChannel
  imageThreshold: number
  imageResolution: number
  imageInvert: number

  // field (surface: 'pattern')
  mode: Mode
  shape: Shape
  seed: number
  grid: number         // blocks across the canvas height
  height: number       // tallest column, in cubes
  coverage: number     // % of the field that rises above ground
  detail: number       // noise frequency
  octaves: number      // noise layers
  warp: number         // domain warping — bends the field into organic shapes
  jitter: number       // per-cell height noise
  steps: number        // quantize heights to N levels (0 = off)
  floaters: number     // loose cubes above the field

  // form
  tilt: number         // isometric angle in degrees
  stretch: number      // cube height relative to its footprint
  gap: number          // % each block shrinks inside its cell
  seam: number
  seamStyle: SeamStyle
  bevel: number        // highlight along the top edge of each block
  grain: number        // film-grain overlay
  occlusion: number    // darkening down the side faces, like light falling off

  // color
  palette: Palette
  colorA: string       // ground
  colorMid: string
  colorB: string       // peaks
  useMid: number       // 1 = three-stop ramp
  curve: number        // ramp easing
  hueShift: number     // hue drift from ground to peak
  saturation: number   // global trim
  light: number        // light direction in degrees — drives face shading
  contrast: number     // spread between the three faces

  // canvas
  aspect: number
  zoom: number         // % magnification of the canvas onto the artwork. The
                       // blocks keep their world size, so zooming in shows
                       // fewer, bigger ones and zooming out shows more, smaller
  backdrop: Backdrop
  bg1: string
  bg2: string
  bgAngle: number
  inset: number        // frame inset, % of the short edge
  frame: number        // keyline width around the inset
  frameColor: string
  shiftX: number
  shiftY: number

  // Independent layers behind the selected surface. The pattern reuses the
  // isometric field language, but is kept sparse and biased to the perimeter.
  backgroundLayer: BackgroundLayer
  backgroundPatternMode: Mode
  backgroundPatternSeed: number
  backgroundPatternGrid: number
  backgroundPatternHeight: number
  backgroundPatternCoverage: number
  backgroundPatternDetail: number
  backgroundPatternWarp: number
  backgroundPatternReach: number
  backgroundPatternOpacity: number

  // Two line families form a skewable grid behind both pattern and artwork.
  // Fade controls how much of the canvas the grid travels through.
  gridSpacing: number
  gridAngle: number
  gridSkew: number
  gridOpacity: number
  gridFade: number
  gridFadeAngle: number
  gridColor: string
}

export const DEFAULTS: Params = {
  surface: 'pattern',
  signal: '', signalMode: 'ridge', signalGain: 100, signalBand: 3, signalSmooth: 2,
  glyphSource: 'typed', glyphSymmetry: 'mirror', glyphDensity: 45,
  text: 'DR', run: 'rise', baseline: 'grid', depth: 2, tracking: 1, fit: 62, custom: '',
  imageChannel: 'auto', imageThreshold: 16, imageResolution: 24, imageInvert: 0,

  mode: 'terrain', shape: 'full', seed: 1,
  grid: 10, height: 6, coverage: 70, detail: 38, octaves: 4,
  warp: 0, jitter: 0, steps: 0, floaters: 3,

  tilt: 30, stretch: 100, gap: 0, seam: 1.5, seamStyle: 'cut',
  // Ship with some material depth: flat fills read as a diagram, not a design.
  bevel: 0, grain: 18, occlusion: 38,

  palette: 'ramp',
  colorA: '#ec8f7a', colorMid: '#f53003', colorB: '#c42602', useMid: 1,
  curve: 100, hueShift: 0, saturation: 100, light: 45, contrast: 100,

  aspect: 2.5, zoom: 100, backdrop: 'gradient', bg1: '#ffe2dd', bg2: '#f0d1c9', bgAngle: 135,
  inset: 0, frame: 0, frameColor: '#c42602', shiftX: 0, shiftY: 0,

  backgroundLayer: 'none',
  backgroundPatternMode: 'terrain', backgroundPatternSeed: 17,
  backgroundPatternGrid: 12, backgroundPatternHeight: 2,
  backgroundPatternCoverage: 44, backgroundPatternDetail: 38,
  backgroundPatternWarp: 12, backgroundPatternReach: 30,
  backgroundPatternOpacity: 58,
  gridSpacing: 9, gridAngle: 30, gridSkew: 120,
  gridOpacity: 18, gridFade: 70, gridFadeAngle: 0, gridColor: '#21201c',
}

// Field values are numbers unless listed here, which keeps parsing honest when
// parameters arrive as strings from a URL or the command line.
export const STRING_KEYS = [
  'surface', 'signal', 'signalMode', 'glyphSource', 'glyphSymmetry',
  'text', 'run', 'baseline', 'custom', 'imageChannel',
  'mode', 'shape', 'palette', 'seamStyle', 'backdrop',
  'colorA', 'colorMid', 'colorB', 'bg1', 'bg2', 'frameColor',
  'backgroundLayer', 'backgroundPatternMode', 'gridColor',
] as const

export const ENUMS: Partial<Record<keyof Params, readonly string[]>> = {
  surface: SURFACES, run: RUNS, baseline: BASELINES,
  signalMode: SIGNAL_MODES, glyphSource: GLYPH_SOURCES, glyphSymmetry: SYMMETRIES,
  mode: MODES, shape: SHAPES, palette: PALETTES, seamStyle: SEAMS, backdrop: BACKDROPS,
  imageChannel: IMAGE_CHANNELS, backgroundLayer: BACKGROUND_LAYERS,
  backgroundPatternMode: MODES,
}

// Hard bounds, applied wherever parameters enter the system.
export const LIMITS: Partial<Record<keyof Params, [number, number]>> = {
  signalGain: [0, 100], signalBand: [1, 14], signalSmooth: [0, 12], glyphDensity: [10, 90],
  depth: [1, 5], tracking: [0, 6], fit: [10, 95],
  imageThreshold: [0, 100], imageResolution: [8, 48], imageInvert: [0, 1],
  seed: [1, 1e9], grid: [4, 26], height: [1, 16], coverage: [0, 100],
  detail: [1, 100], octaves: [1, 6], warp: [0, 100], jitter: [0, 100],
  steps: [0, 8], floaters: [0, 24],
  tilt: [12, 45], stretch: [30, 220], gap: [0, 60], seam: [0, 6],
  bevel: [0, 100], grain: [0, 100], occlusion: [0, 100],
  curve: [20, 320], hueShift: [-180, 180], saturation: [0, 200],
  light: [0, 360], contrast: [0, 220],
  aspect: [1, 6], zoom: [25, 400], bgAngle: [0, 360], inset: [0, 20], frame: [0, 12],
  shiftX: [-60, 60], shiftY: [-60, 60],
  backgroundPatternSeed: [1, 1e9], backgroundPatternGrid: [4, 26],
  backgroundPatternHeight: [1, 8], backgroundPatternCoverage: [0, 100],
  backgroundPatternDetail: [1, 100], backgroundPatternWarp: [0, 100],
  backgroundPatternReach: [5, 85], backgroundPatternOpacity: [0, 100],
  gridSpacing: [2, 30], gridAngle: [-180, 180],
  gridSkew: [15, 165], gridOpacity: [0, 100], gridFade: [0, 100],
  gridFadeAngle: [0, 360],
}

// A field grows to fill whatever canvas it is given, so pulling back costs one
// more column of polygons per cell revealed. This caps how much world may be on
// screen at once, measured in blocks across the canvas height — past it the
// blocks are smaller than the seams between them anyway.
export const MAX_SPAN = 40

export type RampPreset = { name: string; a: string; mid: string; b: string }

// Two- and three-stop ramps. The low end stays mid-toned on purpose: the
// backdrop is a pale tint of it, and ground blocks must stay visible on that.
export const RAMPS: RampPreset[] = [
  // The brand reds from laravel.com/resources/css/app.css: --color-laravel-red
  // and --color-laravel-red-darkened, over a ground stop tinted from the same
  // hue so it still reads against the backdrop.
  { name: 'Laravel',  a: '#ec8f7a', mid: '#f53003', b: '#c42602' },
  { name: 'Ember',    a: '#f2a069', mid: '#d9542a', b: '#a8280f' },
  { name: 'Dusk',     a: '#f0ab97', mid: '#a4517a', b: '#4a2263' },
  { name: 'Ocean',    a: '#79c8ee', mid: '#2d7cb8', b: '#0d3a6d' },
  { name: 'Forest',   a: '#95d68d', mid: '#3f9455', b: '#14532d' },
  { name: 'Grape',    a: '#c9a3f2', mid: '#7d4bc0', b: '#42177f' },
  { name: 'Sand',     a: '#f4cf7c', mid: '#d08a3b', b: '#8f4315' },
  { name: 'Slate',    a: '#b3bfcc', mid: '#5b6b7c', b: '#1e2731' },
  { name: 'Candy',    a: '#f7a8c8', mid: '#d44b8b', b: '#8f1450' },
  { name: 'Moss',     a: '#d7d8a6', mid: '#8a9a5b', b: '#3d4a25' },
  { name: 'Rust',     a: '#e3b8a0', mid: '#b5623c', b: '#5e2612' },
  { name: 'Ice',      a: '#cfe8ee', mid: '#71a8bd', b: '#2b4e63' },
  { name: 'Signal',   a: '#ffd166', mid: '#ef6b3f', b: '#8f1450' },
]

// Switching surface should land somewhere sensible. A trace in particular
// wants full coverage: at the shared default of 70 the quiet third of the
// signal drops to nothing and the waveform breaks into islands. Lowering
// coverage from here is how you deliberately gate silence out.
export const SURFACE_PRESETS: Partial<Record<Surface, Partial<Params>>> = {
  image: { depth: 2, fit: 70, floaters: 0 },
  text:  { coverage: 100, height: 7, grid: 11, warp: 0, floaters: 0, jitter: 0, steps: 0 },
  voice: { coverage: 100, height: 7, grid: 11, warp: 0, floaters: 0, jitter: 0, steps: 0 },
}

// Each composition wants a different amount of room. These are the starting
// points loaded when a mode is picked; everything stays editable afterwards.
export const MODE_PRESETS: Record<Mode, Partial<Params>> = {
  terrain:  { grid: 10, height: 6,  coverage: 70, detail: 38, octaves: 4, floaters: 3, warp: 12 },
  skyline:  { grid: 11, height: 9,  coverage: 60, detail: 26, octaves: 2, floaters: 2, warp: 0 },
  waves:    { grid: 10, height: 5,  coverage: 80, detail: 46, octaves: 1, floaters: 2, warp: 18 },
  islands:  { grid: 9,  height: 7,  coverage: 52, detail: 34, octaves: 2, floaters: 5, warp: 20 },
  terraces: { grid: 9,  height: 6,  coverage: 58, detail: 28, octaves: 2, floaters: 0, warp: 24 },
  drift:    { grid: 10, height: 4,  coverage: 28, detail: 50, octaves: 1, floaters: 6, warp: 0 },
  rings:    { grid: 11, height: 7,  coverage: 62, detail: 30, octaves: 1, floaters: 3, warp: 30 },
  weave:    { grid: 12, height: 5,  coverage: 72, detail: 40, octaves: 1, floaters: 0, warp: 8 },
}
