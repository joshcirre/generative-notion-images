import {
  DEFAULTS, ENUMS, LIMITS, MAX_SPAN, MAX_TEXT, MODE_PRESETS, MODES, RAMPS, SHAPES,
  STRING_KEYS, SURFACE_PRESETS,
  type Mode, type Params, type Surface,
} from './types'
import { rng } from './noise'
import { isValidMask } from './font'
import { isValidSignal } from './signal'
import { tint } from './color'

const STRINGS = new Set<string>(STRING_KEYS)
// Empty normally means "not supplied", so the default stands. For these two it
// is a real value: an emptied text box should stay empty, and an empty mask
// means no hand-edited glyph.
const EMPTY_IS_A_VALUE = new Set<string>(['text', 'custom', 'signal'])

/** Coerce anything — URL strings, CLI args, partial objects — into valid Params. */
export function normalize(input: Partial<Record<keyof Params, unknown>>): Params {
  const out = { ...DEFAULTS } as Params
  for (const k of Object.keys(DEFAULTS) as Array<keyof Params>) {
    const given = input[k]
    if (given === undefined || given === null) continue
    if (given === '' && !EMPTY_IS_A_VALUE.has(k)) continue
    if (STRINGS.has(k)) {
      const s = String(given)
      const allowed = ENUMS[k]
      if (allowed && !allowed.includes(s)) continue
      ;(out as Record<string, unknown>)[k] = s
    } else {
      const n = Number(given)
      if (!Number.isFinite(n)) continue
      const [lo, hi] = LIMITS[k] ?? [-Infinity, Infinity]
      ;(out as Record<string, unknown>)[k] = Math.min(hi, Math.max(lo, n))
    }
  }
  out.text = String(out.text).slice(0, MAX_TEXT)
  out.custom = isValidMask(out.custom) ? out.custom : ''
  out.signal = isValidSignal(out.signal) ? out.signal : ''
  out.depth = Math.round(out.depth)
  out.seed = Math.max(1, Math.round(out.seed))
  out.grid = Math.round(out.grid)
  out.height = Math.round(out.height)
  out.octaves = Math.round(out.octaves)
  out.steps = Math.round(out.steps)
  out.floaters = Math.round(out.floaters)
  out.imageResolution = Math.round(out.imageResolution)
  out.imageInvert = out.imageInvert ? 1 : 0
  out.useMid = out.useMid ? 1 : 0
  out.backgroundPatternSeed = Math.max(1, Math.round(out.backgroundPatternSeed))
  out.backgroundPatternGrid = Math.round(out.backgroundPatternGrid)
  out.backgroundPatternHeight = Math.round(out.backgroundPatternHeight)
  out.zoom = Math.max(Math.round(out.zoom), zoomFloor(out))
  return out
}

/**
 * How far the canvas may pull back, in percent. A field keeps generating to fill
 * whatever it is given, so its floor rises with the grid it is already drawing
 * at. Letters draw a fixed set of blocks however far out you stand, so they get
 * the full range.
 */
export function zoomFloor(p: Pick<Params, 'surface' | 'grid'>): number {
  const [lo] = LIMITS.zoom!
  return p.surface === 'letters' || p.surface === 'image'
    ? lo
    : Math.max(lo, Math.ceil((p.grid / MAX_SPAN) * 100))
}

/** Starting point for a composition, with everything else left at defaults. */
export function preset(mode: Mode): Params {
  return normalize({ ...DEFAULTS, ...MODE_PRESETS[mode], mode })
}

/** Starting point for a surface, keeping everything that isn't about it. */
export function surfacePreset(surface: Surface, from: Params): Params {
  return normalize({ ...from, ...SURFACE_PRESETS[surface], surface })
}

/**
 * A fresh design that still looks deliberate: start from the composition's own
 * preset and wander around it rather than rolling every knob uniformly. The
 * seed drives every choice, so a seed always returns the same design.
 */
export function randomize(seed: number, surface: Surface = 'pattern'): Params {
  const rand = rng(Math.imul(seed || 1, 2654435761) ^ 0x9e3779b9)
  for (let i = 0; i < 4; i++) rand() // consecutive seeds otherwise open alike
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
  const near = (v: number, spread: number, lo: number, hi: number) =>
    Math.round(Math.max(lo, Math.min(hi, v + (rand() * 2 - 1) * spread)))

  const ramp = pick(RAMPS)
  const mode = pick(MODES)
  const base = preset(mode)

  // Island, ridge, corner and vignette all carve most of the canvas away. Left
  // alone they reliably produce a speck in an empty banner, so they get a denser
  // field and a finer grid to carve out of.
  const shape = rand() < 0.55 ? 'full' : pick(SHAPES.filter(s => s !== 'full'))
  const carved = shape !== 'full'
  // Islands and drift are already mostly negative space, and every shape but
  // `full` carves away more. Stacked, they reliably produce a speck in an empty
  // banner, so both get a denser field and a finer grid to carve out of.
  const airy = mode === 'islands' || mode === 'drift'
  const lift = (carved ? 26 : 0) + (carved && airy ? 14 : 0)
  const floor = carved ? (airy ? 60 : 48) : airy ? 34 : 18

  // Letters roll their own layout and share everything downstream — material,
  // palette, canvas. Text and any custom mask are content, not style, so the
  // caller keeps those.
  const letters = surface === 'letters' ? {
    surface,
    run: rand() < 0.5 ? 'rise' as const : 'fall' as const,
    baseline: rand() < 0.5 ? 'grid' as const : 'flat' as const,
    depth: near(2, 1.4, 1, 4),
    tracking: near(1, 1.4, 0, 3),
    fit: near(62, 14, 38, 82),
  } : {}

  return normalize({
    ...base,
    ...letters,
    seed: seed || 1,
    shape,
    grid: near(base.grid + (carved ? 3 : 0), 3, carved ? 10 : 6, 17),
    height: near(base.height, 2, 3, 12),
    coverage: near(base.coverage + lift, 14, floor, 96),
    detail: near(base.detail, 16, 12, 80),
    octaves: near(base.octaves, 1, 1, 5),
    warp: rand() < 0.55 ? near(base.warp, 20, 0, 70) : 0,
    jitter: rand() < 0.25 ? near(12, 12, 0, 35) : 0,
    steps: rand() < 0.3 ? near(3, 2, 2, 6) : 0,
    floaters: rand() < 0.5 ? near(base.floaters, 4, 0, 9) : 0,

    tilt: rand() < 0.35 ? near(30, 9, 16, 42) : 30,
    stretch: rand() < 0.45 ? near(100, 45, 45, 190) : 100,
    gap: rand() < 0.22 ? near(18, 14, 5, 40) : 0,
    seamStyle: rand() < 0.72 ? 'cut' : pick(['light', 'dark', 'none'] as const),
    bevel: rand() < 0.3 ? near(45, 30, 10, 90) : 0,
    grain: rand() < 0.45 ? near(35, 25, 8, 70) : 0,
    occlusion: rand() < 0.55 ? near(45, 30, 10, 90) : 0,

    palette: rand() < 0.68 ? 'ramp' : pick(['duotone', 'banded', 'scatter'] as const),
    colorA: ramp.a, colorMid: ramp.mid, colorB: ramp.b,
    useMid: rand() < 0.45 ? 1 : 0,
    curve: near(100, 55, 45, 220),
    hueShift: rand() < 0.28 ? near(0, 55, -70, 70) : 0,
    saturation: near(100, 20, 70, 135),
    light: rand() < 0.4 ? near(45, 140, 0, 360) : 45,
    contrast: near(100, 45, 45, 190),

    backdrop: rand() < 0.82 ? 'gradient' : pick(['solid', 'none'] as const),
    bg1: tint(ramp.a, 0.82),
    bg2: tint(ramp.b, 0.8),
    bgAngle: near(135, 90, 0, 360),
    inset: rand() < 0.22 ? near(5, 3, 2, 9) : 0,
    frame: 0,
    frameColor: ramp.b,

    backgroundPatternMode: pick(MODES),
    backgroundPatternSeed: Math.max(1, Math.floor(rand() * 99999)),
    backgroundPatternGrid: near(12, 4, 8, 20),
    backgroundPatternHeight: near(2, 1.4, 1, 5),
    backgroundPatternCoverage: near(44, 16, 20, 68),
    backgroundPatternDetail: near(38, 18, 10, 82),
    backgroundPatternWarp: rand() < 0.55 ? near(16, 18, 0, 55) : 0,
    backgroundPatternReach: near(30, 12, 12, 55),
    backgroundPatternOpacity: near(58, 18, 28, 82),
  })
}

/** Only what differs from the defaults, so shared links stay readable. */
export function toQuery(p: Partial<Params>): string {
  const full = normalize(p)
  const q = new URLSearchParams()
  for (const k of Object.keys(DEFAULTS) as Array<keyof Params>) {
    if (String(full[k]) !== String(DEFAULTS[k])) q.set(k, String(full[k]))
  }
  return q.toString()
}

export function fromQuery(str: string): Partial<Params> {
  const q = new URLSearchParams(String(str || '').replace(/^[#?]/, ''))
  const out: Record<string, string> = {}
  for (const k of Object.keys(DEFAULTS)) {
    const v = q.get(k)
    if (v !== null) out[k] = v
  }
  // Links created by the first grid implementation used a boolean toggle.
  // Keep those links useful while omitting the retired key from new URLs.
  if (!q.has('backgroundLayer') && Number(q.get('gridOverlay'))) out.backgroundLayer = 'grid'
  return out as Partial<Params>
}

export { DEFAULTS, MODES, SHAPES, RAMPS, MODE_PRESETS, SURFACE_PRESETS }
export type { Params, Mode, Surface }
