import type { Params } from './types'
import { normalize } from './params'
import { GLYPH_H, GLYPH_W, generateMask, glyphMask, maskCells, soleGlyph } from './font'
import {
  averageAt, decodeSignal, hashText, sampleAt, signalFromText, smoothSignal,
} from './signal'
import { clamp, clamp01, fbm, frac, hash2, lerp, mod, rng, smooth, warpPoint } from './noise'
import { darken, facesFor, hexToHsl, hslToHex, lighten, mix, type Faces } from './color'

const BASE = 40 // footprint unit; one cell is BASE wide before projection

export type Rect = { x: number; y: number; w: number; h: number }
export type SceneResult = {
  svg: string
  view: Rect
  faces: number
  peak: number
  params: Params
}

type Poly = { pts: string; fill: string; stroke?: string; sw?: number }

const r1 = (n: number) => Math.round(n * 10) / 10

/** Raw 0..1 elevation for a cell. Density and height are applied afterwards, so
 *  the same knobs behave the same way whichever composition is picked. */
function field(mode: Params['mode'], u: number, v: number, seed: number, freq: number, oct: number): number {
  switch (mode) {
    case 'skyline': {
      const B = 4 // city block, with streets along the seams
      if (mod(Math.round(u), B) === 0 || mod(Math.round(v), B) === 0) return 0
      const bu = Math.floor(u / B), bv = Math.floor(v / B)
      return clamp01(hash2(bu, bv, seed) * 0.5 + fbm(bu * freq * 2.4, bv * freq * 2.4, seed + 31, oct) * 0.85)
    }
    case 'waves': {
      const a = Math.sin((u + v) * freq * 2.2 + seed * 0.7)
      const b = Math.sin((u - v) * freq * 1.3 - seed * 0.3)
      return clamp01((a * 0.6 + b * 0.4) * 0.5 + 0.5)
    }
    case 'islands':
      return clamp01(Math.pow(fbm(u * freq * 0.7, v * freq * 0.7, seed, Math.max(2, oct)), 2) * 1.9)
    case 'terraces': {
      const w = fbm(u * freq * 0.6, v * freq * 0.6, seed, oct)
      return frac((u * 0.5 - v * 0.35) * freq * 2.5 + w * 1.6)
    }
    case 'drift':
      return Math.pow(hash2(Math.round(u), Math.round(v), seed), 2.2)
    case 'rings': {
      const d = Math.hypot(u, v)
      return clamp01(0.5 + 0.5 * Math.sin(d * freq * 3.4 + seed))
    }
    case 'weave': {
      const W = 3
      const su = Math.floor(u / W), sv = Math.floor(v / W)
      const over = mod(su + sv, 2) === 0
      const t = over ? mod(v, W) : mod(u, W)
      return clamp01((over ? 0.78 : 0.36) + (Math.sin((t / W) * Math.PI) - 0.5) * 0.28)
    }
    default:
      return clamp01(fbm(u * freq, v * freq, seed, oct))
  }
}

// ---------------------------------------------------------------------------
// Shared plotting surface: an isometric grid both generators draw boxes onto.
// ---------------------------------------------------------------------------

function makePlotter(p: Params) {
  const rad = (p.tilt * Math.PI) / 180
  const HW = BASE * Math.cos(rad)
  const HH = BASE * Math.sin(rad)
  const VE = BASE * (p.stretch / 100) // vertical cube edge
  const g = p.gap / 200               // inset applied to each side of a footprint

  const px = (a: number, b: number) => r1((a - b) * HW)
  const py = (a: number, b: number, h: number) => r1((a + b) * HH - h * VE)

  const polys: Poly[] = []
  const subdivide = (p.seam > 0 && p.seamStyle !== 'none') || p.occlusion > 0
  const bevelOn = p.bevel > 0
  const occl = p.occlusion / 100

  /**
   * One box on the grid. The footprint spans u0..u1 by v0..v1, so a terrain
   * column is a single cell and a letter block can run several cells deep.
   * cullL / cullR are the heights below which a neighbour hides that side.
   */
  function box(
    u0: number, u1: number, v0: number, v1: number,
    y0: number, y1: number, f: Faces, cullL = 0, cullR = 0,
  ) {
    const aN = u0 + g, bN = v0 + g, aF = u1 - g, bF = v1 - g
    const Nx = px(aN, bN), Ex = px(aF, bN), Sx = px(aF, bF), Wx = px(aN, bF)

    const topPts =
      `${Nx},${py(aN, bN, y1)} ${Ex},${py(aF, bN, y1)} ${Sx},${py(aF, bF, y1)} ${Wx},${py(aN, bF, y1)}`
    polys.push(bevelOn
      ? { pts: topPts, fill: f.top, stroke: lighten(f.top, (p.bevel / 100) * 0.55), sw: 0.6 + p.bevel / 40 }
      : { pts: topPts, fill: f.top })

    // Sides run from the top down to whichever is higher: the box's own floor
    // or the neighbour that hides it.
    const side = (ax: number, ay: number, bx: number, by: number, from: number, color: string) => {
      const step = subdivide ? 1 : y1 - from
      if (step <= 0) return
      for (let k = from; k < y1; k += step) {
        const top = Math.min(k + step, y1)
        // Light falls off going down a column and into the crevices between them.
        const shade = occl > 0 ? clamp01((y1 - top) / 4) * occl * 0.55 : 0
        polys.push({
          pts: `${ax},${r1(ay - top * VE)} ${bx},${r1(by - top * VE)} ` +
               `${bx},${r1(by - k * VE)} ${ax},${r1(ay - k * VE)}`,
          fill: shade > 0 ? darken(color, shade) : color,
        })
      }
    }
    const lf = Math.max(y0, cullL), rf = Math.max(y0, cullR)
    if (lf < y1) side(Wx, py(aN, bF, 0), Sx, py(aF, bF, 0), lf, f.left)
    if (rf < y1) side(Sx, py(aF, bF, 0), Ex, py(aF, bN, 0), rf, f.right)
  }

  /** Screen bounds of a footprint, for framing the canvas around the artwork. */
  function bounds(u0: number, u1: number, v0: number, v1: number, y0: number, y1: number) {
    return {
      minX: px(u0, v1), maxX: px(u1, v0),
      minY: py(u0, v0, y1), maxY: py(u1, v1, y0),
    }
  }

  return { polys, box, bounds, px, py, HW, HH, VE }
}

type Plotter = ReturnType<typeof makePlotter>

/** Palette lookup shared by both surfaces: a 0..1 tone in, three faces out. */
function makePalette(p: Params) {
  const twoStage = (t: number) =>
    t < 0.5 ? mix(p.colorA, p.colorMid, t * 2) : mix(p.colorMid, p.colorB, (t - 0.5) * 2)

  function rampColor(t01: number): string {
    let t = Math.pow(clamp01(t01), p.curve / 100)
    let base: string
    switch (p.palette) {
      case 'duotone': base = t < 0.5 ? p.colorA : p.colorB; break
      case 'banded': {
        const bands = 4
        const q = Math.round(t * (bands - 1)) / (bands - 1)
        base = p.useMid ? twoStage(q) : mix(p.colorA, p.colorB, q)
        break
      }
      default: base = p.useMid ? twoStage(t) : mix(p.colorA, p.colorB, t)
    }
    if (p.hueShift !== 0 || p.saturation !== 100) {
      const [h, s, l] = hexToHsl(base)
      base = hslToHex(h + p.hueShift * t, s * (p.saturation / 100), l)
    }
    return base
  }

  const cache = new Map<number, Faces>()
  return (tone: number, u = 0, v = 0): Faces => {
    if (p.palette === 'scatter') {
      // Colored per cell rather than by elevation, so it reads as confetti.
      return facesFor(rampColor(hash2(u, v, p.seed + 313)), p.light, p.contrast)
    }
    const q = Math.round(clamp01(tone) * 64)
    let f = cache.get(q)
    if (!f) {
      f = facesFor(rampColor(q / 64), p.light, p.contrast)
      cache.set(q, f)
    }
    return f
  }
}

// ---------------------------------------------------------------------------

export function buildScene(input: Partial<Params> = {}): SceneResult {
  const p = normalize(input)
  const plot = makePlotter(p)
  const palette = makePalette(p)
  const out = p.surface === 'letters' ? plotLetters(p, plot, palette) : plotField(p, plot, palette)

  return {
    svg: assemble(plot.polys, p, out.view),
    view: out.view,
    faces: plot.polys.length,
    peak: out.peak,
    params: p,
  }
}

// ---------------------------------------------------------------------------
// Surface: generative height field
// ---------------------------------------------------------------------------

function plotField(p: Params, plot: Plotter, palette: ReturnType<typeof makePalette>) {
  const { px, py, HW, HH, VE, box } = plot

  // Text drives its own variation: the same words always land on the same
  // design, and the seed knob still walks you through variants of it.
  const seed = p.surface === 'text'
    ? ((p.seed ^ hashText(p.text)) >>> 0) || 1
    : p.seed
  const rand = rng(Math.imul(seed, 9176) ^ 0x5bf03635)

  // Text and voice both reduce to the same frozen run of samples.
  const samples = p.surface === 'text' ? signalFromText(p.text)
    : p.surface === 'voice' ? decodeSignal(p.signal)
    : null
  const sig = samples ? smoothSignal(samples, p.signalSmooth) : null

  // A banded trace has a knowable extent, so the canvas is sized to contain it
  // rather than to a nominal grid. Without this a square canvas clips the
  // columns straight off the bottom.
  const banded = !!sig && p.signalMode !== 'radial'
  const traceH = (2 * p.signalBand + 2) * HH + p.height * VE
  const vh = banded ? Math.max(p.grid * BASE, traceH / 0.86) : p.grid * BASE
  const vw = vh * p.aspect
  const vx = -vw / 2 + (p.shiftX / 100) * vw
  const vy = banded
    // Centre on the trace itself: it sits on the d = 0 line and rises from there.
    ? HH - (p.height * VE) / 2 - vh / 2 + (p.shiftY / 100) * vh
    : -vh / 2 - p.height * VE * 0.35 + (p.shiftY / 100) * vh
  const view: Rect = { x: vx, y: vy, w: vw, h: vh }
  const cx = vx + vw / 2, cy = vy + vh / 2

  // Walk the grid in (d = u+v, s = u-v); d ascending is already back-to-front.
  const smin = Math.floor(vx / HW) - 2, smax = Math.ceil((vx + vw) / HW) + 2
  const dmin = Math.floor(vy / HH) - 2
  const dmax = Math.ceil((vy + vh) / HH) + Math.ceil((p.height * VE) / HH) + 2

  const freq = 0.04 + (p.detail / 100) * 0.26
  const cover = p.coverage / 100

  function falloff(u: number, v: number): number {
    if (p.shape === 'full') return 1
    const X = (px(u, v) - cx) / (vw / 2)
    const Y = (py(u, v, 0) - cy) / (vh / 2)
    switch (p.shape) {
      case 'ridge': return smooth(clamp01(1.3 - Math.abs(Y) * 1.3))
      case 'corner': return smooth(clamp01(1.15 - ((X + Y + 2) / 4) * 1.6))
      // Dense at the edges, open in the middle — leaves the center clear for a
      // page title to sit over.
      case 'vignette': return smooth(clamp01(Math.hypot(X * 0.9, Y) * 1.25 - 0.15))
      default: return smooth(clamp01(1.35 - Math.hypot(X * 0.9, Y) * 1.35))
    }
  }

  /**
   * Where a cell reads the signal. `ridge` runs it left to right so the trace
   * becomes a profile across the banner; `bars` breaks that into columns with
   * gaps; `radial` reads it outwards from the middle as rings.
   */
  function signalAt(u: number, v: number): number {
    if (!sig) return 0
    if (p.signalMode === 'radial') {
      const X = (px(u, v) - cx) / (vw / 2)
      const Y = (py(u, v, 0) - cy) / (vh / 2)
      return sampleAt(sig, Math.hypot(X * 0.9, Y))
    }
    // Columns are constant (u - v), so index by that and average across each
    // column's own slice of the signal.
    const col = u - v
    // Every other column is left empty, which is what turns a ridge into bars.
    if (p.signalMode === 'bars' && mod(col - smin, 2) !== 0) return 0
    const span = (smax - smin) || 1
    return averageAt(sig, (col - smin) / span, (col + 1 - smin) / span)
  }

  // The trace lives on a ribbon: cells are only raised within a band of
  // constant depth, which on screen is a horizontal line. Without the band the
  // field recedes forever and the profile is never visible in silhouette.
  const dCenter = 0

  // Pass 1: raw field, stretched to use its whole range. Smoothed noise clusters
  // hard around its midpoint; without this most cells land on one elevation and
  // both relief and color wash out.
  const cells: Array<[number, number]> = []
  for (let d = dmin; d <= dmax + 2; d++) {
    for (let s = smin - 2 + mod(d - smin, 2); s <= smax + 2; s += 2) {
      cells.push([(d + s) / 2, (d - s) / 2])
    }
  }
  const key = (u: number, v: number) => u + ',' + v
  const raw = new Map<string, number>()
  let lo = Infinity, hi = -Infinity
  for (const [u, v] of cells) {
    const [wu, wv] = warpPoint(u, v, seed, p.warp / 100)
    let n = field(p.mode, wu, wv, seed, freq, p.octaves)
    // Gain crossfades between the chosen composition and the signal, so a
    // waveform can either replace the terrain or just ripple through it.
    if (sig) {
      n = lerp(n, signalAt(u, v), p.signalGain / 100)
      if (p.signalMode !== 'radial' && Math.abs(u + v - dCenter) > p.signalBand) n = 0
    }
    raw.set(key(u, v), n)
    if (n < lo) lo = n
    if (n > hi) hi = n
  }
  const span = hi - lo || 1

  // Pass 2: elevations, computed one row past the near edge so face culling has
  // neighbours to consult.
  const heights = new Map<string, number>()
  let peak = 1
  for (const [u, v] of cells) {
    let h = 0
    if (cover > 0) {
      let n = ((raw.get(key(u, v))! - lo) / span) * falloff(u, v)
      if (p.jitter > 0) n += (hash2(u, v, seed + 7717) - 0.5) * (p.jitter / 100)
      const t = (clamp01(n) - (1 - cover)) / cover
      if (t > 0) {
        let e = Math.pow(Math.min(t, 1), 1.2)
        if (p.steps > 0) e = Math.round(e * p.steps) / p.steps
        h = 1 + Math.round(e * (p.height - 1))
      }
    }
    heights.set(key(u, v), h)
    if (h > peak) peak = h
  }
  // Tone is keyed to the tallest column actually generated, not the nominal
  // ceiling: a low-relief scene would otherwise sit entirely at the pale end.
  const toneFor = (h: number) => (peak > 1 ? (clamp(h, 1, peak) - 1) / (peak - 1) : 1)

  // Loose cubes above the field, keyed to their own cell so they sort into the
  // same back-to-front order as everything else.
  const floaters = new Map<number, Array<{ u: number; v: number; y0: number; y1: number }>>()
  for (let i = 0; i < p.floaters; i++) {
    const d = dmin + Math.floor(rand() * (dmax - dmin))
    const s0 = smin + Math.floor(rand() * (smax - smin))
    const s = mod(d - s0, 2) ? s0 + 1 : s0
    const u = (d + s) / 2, v = d - u
    const base = (heights.get(key(u, v)) ?? 0) + 2 + Math.floor(rand() * 3)
    if (!floaters.has(d)) floaters.set(d, [])
    floaters.get(d)!.push({ u, v, y0: base, y1: base + 1 })
  }

  // Pass 3: faces, back to front. Separated blocks show all their sides; only a
  // continuous field hides them.
  const canCull = p.gap === 0
  for (let d = dmin; d <= dmax; d++) {
    for (let s = smin + mod(d - smin, 2); s <= smax; s += 2) {
      const u = (d + s) / 2, v = (d - s) / 2
      const h = heights.get(key(u, v)) ?? 0
      if (h > 0) {
        box(u, u + 1, v, v + 1, 0, h, palette(toneFor(h), u, v),
          canCull ? heights.get(key(u, v + 1)) ?? 0 : 0,
          canCull ? heights.get(key(u + 1, v)) ?? 0 : 0)
      }
      for (const f of floaters.get(d) ?? []) {
        if (f.u === u && f.v === v) {
          box(f.u, f.u + 1, f.v, f.v + 1, f.y0, f.y1, palette(toneFor(f.y1), f.u, f.v))
        }
      }
    }
  }

  return { view, peak }
}

// ---------------------------------------------------------------------------
// Surface: block letters
// ---------------------------------------------------------------------------

function plotLetters(p: Params, plot: Plotter, palette: ReturnType<typeof makePalette>) {
  const { box, bounds } = plot

  // A custom mask only applies when the text is a single glyph — that is the
  // only case the editor can address unambiguously.
  const generated = p.glyphSource === 'generated'
  const sole = soleGlyph(p.text)
  const advance = GLYPH_W + p.tracking
  const flat = p.baseline === 'flat'

  // Moving (+1 u, -1 v) is purely horizontal on screen, so a glyph can be slid
  // sideways onto a shared baseline without leaving the grid.
  const slide = (GLYPH_W + p.depth + p.tracking) / 2

  const cells: Array<{ k: number; z: number; gi: number; off: number }> = []
  if (generated) {
    // One abstract mark rather than typed characters. A hand-edit still wins,
    // so you can generate a mark and then tidy it in the editor.
    const mask = p.custom || generateMask(p.seed, p.glyphDensity, p.glyphSymmetry)
    for (const { x, z } of maskCells(mask)) cells.push({ k: x, z, gi: 0, off: 0 })
  }
  let pen = 0
  let gi = 0
  for (const ch of generated ? '' : p.text.toUpperCase()) {
    if (ch === ' ') {
      pen += Math.max(2, Math.round(advance * 0.55))
      gi++
      continue
    }
    const mask = (sole && p.custom) || glyphMask(ch)
    if (!mask) continue
    for (const { x, z } of maskCells(mask)) {
      cells.push(flat
        ? { k: x, z, gi, off: gi * slide }
        : { k: pen + x, z, gi, off: 0 })
    }
    pen += advance
    gi++
  }

  // The word runs along one horizontal grid axis and each block extends `depth`
  // cells along the other. Running along +u descends to the right; running along
  // -v climbs.
  const climbs = p.run === 'rise'
  const foot = (k: number, off: number) => climbs
    ? { u0: off, u1: p.depth + off, v0: -k - 1 - off, v1: -k - off }
    : { u0: k + off, u1: k + 1 + off, v0: -off, v1: p.depth - off }

  // Back to front: a box's depth on screen is u+v, and stacked blocks paint
  // bottom-up. On a flat baseline the glyphs are separate objects at the same
  // height, so the neighbour that sits lower on screen wins — which is the
  // opposite order to columns inside a glyph.
  const order = [...cells].sort((a, b) => {
    if (flat && a.gi !== b.gi) return climbs ? a.gi - b.gi : b.gi - a.gi
    const fa = foot(a.k, a.off), fb = foot(b.k, b.off)
    return (fa.u0 + fa.v0) - (fb.u0 + fb.v0) || a.z - b.z
  })

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const occl = p.occlusion / 100
  for (const { k, z, off } of order) {
    const { u0, u1, v0, v1 } = foot(k, off)
    const tone = GLYPH_H > 1 ? z / (GLYPH_H - 1) : 1
    let faces = palette(tone, u0, v0)
    if (occl > 0) {
      // Nothing stacks in a letter, so the falloff keys off how low the block
      // sits in the glyph instead of how deep it sits in a column.
      const shade = clamp01((GLYPH_H - 1 - z) / (GLYPH_H - 1)) * occl * 0.4
      faces = { top: faces.top, left: darken(faces.left, shade), right: darken(faces.right, shade) }
    }
    box(u0, u1, v0, v1, z, z + 1, faces)

    const b = bounds(u0, u1, v0, v1, z, z + 1)
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX)
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY)
  }

  // Frame the canvas around the wordmark, widening if the text would otherwise
  // run off the sides.
  const MARGIN = 0.06
  const bw = maxX - minX, bh = maxY - minY
  let vh: number, vw: number
  if (!order.length) {
    vh = p.grid * BASE
    vw = vh * p.aspect
    minX = -vw / 2; maxX = vw / 2; minY = -vh / 2; maxY = vh / 2
  } else {
    vh = bh / (p.fit / 100)
    vw = vh * p.aspect
    const needed = bw / (1 - 2 * MARGIN)
    if (vw < needed) { vw = needed; vh = vw / p.aspect }
  }
  const vx = (minX + maxX) / 2 - vw / 2 + (p.shiftX / 100) * vw
  const vy = (minY + maxY) / 2 - vh / 2 + (p.shiftY / 100) * vh

  return { view: { x: vx, y: vy, w: vw, h: vh }, peak: GLYPH_H }
}

// ---------------------------------------------------------------------------

function assemble(polys: Poly[], p: Params, view: Rect): string {
  const { x, y, w, h } = view
  const defs: string[] = []
  const body: string[] = []

  if (p.backdrop === 'solid') {
    body.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${p.bg1}"/>`)
  } else if (p.backdrop === 'gradient') {
    const a = (p.bgAngle * Math.PI) / 180
    const dx = Math.cos(a) * 0.5, dy = Math.sin(a) * 0.5
    defs.push(
      `<linearGradient id="bg" x1="${r1(0.5 - dx)}" y1="${r1(0.5 - dy)}" x2="${r1(0.5 + dx)}" y2="${r1(0.5 + dy)}">` +
      `<stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient>`)
    body.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="url(#bg)"/>`)
  }

  // Self-stroking each face closes antialiasing gaps between neighbours.
  const fills = polys.map(q => {
    const stroke = q.stroke ?? q.fill
    const sw = q.sw ?? 0.75
    return `<polygon points="${q.pts}" fill="${q.fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  }).join('')

  let art: string
  if (p.seam <= 0 || p.seamStyle === 'none') {
    art = fills
  } else if (p.seamStyle === 'cut') {
    // White keeps the face, black seam lines cut gaps through to the backdrop.
    // Same paint order as the fills, so nearer blocks cover the seams of the
    // blocks they hide.
    const mask = polys.map(q =>
      `<polygon points="${q.pts}" fill="#fff" stroke="#000" stroke-width="${p.seam}" stroke-linejoin="round"/>`).join('')
    defs.push(`<mask id="seams" maskUnits="userSpaceOnUse" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}">${mask}</mask>`)
    art = `<g mask="url(#seams)">${fills}</g>`
  } else {
    const ink = p.seamStyle === 'light' ? '#ffffff' : '#1c1512'
    const op = p.seamStyle === 'light' ? 0.75 : 0.5
    art = polys.map(q =>
      `<polygon points="${q.pts}" fill="${q.fill}" stroke="${ink}" stroke-opacity="${op}" stroke-width="${p.seam}" stroke-linejoin="round"/>`).join('')
  }

  // inset frame — the artwork is matted inside the canvas
  const pad = (p.inset / 100) * h
  const inner = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 }
  if (pad > 0) {
    defs.push(`<clipPath id="mat"><rect x="${r1(inner.x)}" y="${r1(inner.y)}" width="${r1(inner.w)}" height="${r1(inner.h)}"/></clipPath>`)
    body.push(`<g clip-path="url(#mat)">${art}</g>`)
  } else {
    body.push(art)
  }

  if (p.grain > 0) {
    defs.push(
      `<filter id="grain" x="0" y="0" width="100%" height="100%">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0"/></filter>`)
    body.push(
      `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" ` +
      `filter="url(#grain)" opacity="${r1((p.grain / 100) * 0.42)}" ` +
      `style="mix-blend-mode:multiply" pointer-events="none"/>`)
  }

  if (p.frame > 0) {
    const half = p.frame / 2
    body.push(
      `<rect x="${r1(inner.x + half)}" y="${r1(inner.y + half)}" ` +
      `width="${r1(inner.w - p.frame)}" height="${r1(inner.h - p.frame)}" ` +
      `fill="none" stroke="${p.frameColor}" stroke-width="${p.frame}"/>`)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x)} ${r1(y)} ${r1(w)} ${r1(h)}">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') + body.join('') + '</svg>'
}
