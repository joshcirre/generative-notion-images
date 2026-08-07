// A "signal" is the shared currency between the text- and voice-driven
// surfaces: a fixed-length run of 0..1 values that modulates the height field.
//
// Signals are always frozen into a parameter rather than read live at render
// time. That is what lets an audio-derived design stay reproducible — the CLI
// can rebuild it months later from the URL alone, with no microphone and no
// audio file anywhere in sight.

import { clamp01, lerp } from './noise'

export const SIGNAL_LEN = 48

// URL-safe, one character per sample, 64 levels each.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function encodeSignal(values: number[]): string {
  const out: string[] = []
  for (let i = 0; i < SIGNAL_LEN; i++) {
    const v = clamp01(values[i] ?? 0)
    out.push(ALPHABET[Math.round(v * 63)]!)
  }
  return out.join('')
}

export function decodeSignal(encoded: string): number[] | null {
  if (typeof encoded !== 'string' || encoded.length !== SIGNAL_LEN) return null
  const out: number[] = []
  for (const ch of encoded) {
    const i = ALPHABET.indexOf(ch)
    if (i < 0) return null
    out.push(i / 63)
  }
  return out
}

export const isValidSignal = (s: string) => decodeSignal(s) !== null

/** Stretch or squash an arbitrary run of samples onto the fixed signal length. */
export function resample(values: number[], length = SIGNAL_LEN): number[] {
  if (!values.length) return new Array(length).fill(0)
  const out: number[] = []
  for (let i = 0; i < length; i++) {
    const pos = (i / (length - 1 || 1)) * (values.length - 1)
    const lo = Math.floor(pos), hi = Math.min(values.length - 1, lo + 1)
    out.push(lerp(values[lo]!, values[hi]!, pos - lo))
  }
  return out
}

/** Lift the quiet parts so a soft recording still produces relief. */
export function normalizeSignal(values: number[]): number[] {
  let hi = 0
  for (const v of values) if (v > hi) hi = v
  if (hi <= 0.0001) return values.map(() => 0)
  return values.map(v => clamp01(v / hi))
}

export function smoothSignal(values: number[], radius: number): number[] {
  const r = Math.round(radius)
  if (r <= 0) return values
  return values.map((_, i) => {
    let sum = 0, n = 0
    for (let k = -r; k <= r; k++) {
      const v = values[i + k]
      if (v !== undefined) { sum += v; n++ }
    }
    return sum / (n || 1)
  })
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/**
 * Where a character sits in the run. Letters climb through the alphabet, digits
 * climb through their range, whitespace drops to the floor and punctuation
 * spikes — so the shape you get is a readable trace of what you typed rather
 * than a hash. Nearby texts land on nearby designs.
 */
function charWeight(ch: string): number {
  const c = ch.toLowerCase()
  if (/\s/.test(c)) return 0.06
  const letter = c.charCodeAt(0) - 97
  if (letter >= 0 && letter < 26) return 0.22 + (letter / 25) * 0.72
  const digit = c.charCodeAt(0) - 48
  if (digit >= 0 && digit < 10) return 0.18 + (digit / 9) * 0.6
  return 0.97
}

export function signalFromText(text: string): number[] {
  const t = text.trim()
  if (!t) return new Array(SIGNAL_LEN).fill(0)
  // Read the string across the full length, blending between neighbouring
  // characters so short text produces a smooth curve instead of 48 steps.
  const out: number[] = []
  for (let i = 0; i < SIGNAL_LEN; i++) {
    const pos = (i / SIGNAL_LEN) * t.length
    const lo = Math.floor(pos) % t.length
    const hi = (lo + 1) % t.length
    out.push(lerp(charWeight(t[lo]!), charWeight(t[hi]!), pos - Math.floor(pos)))
  }
  return out
}

/** A stable 32-bit hash, so the same text always seeds the same variation. */
export function hashText(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 1
}

/** Read a signal at a 0..1 position, interpolating between samples. */
export function sampleAt(values: number[], t: number): number {
  const pos = clamp01(t) * (values.length - 1)
  const lo = Math.floor(pos), hi = Math.min(values.length - 1, lo + 1)
  return lerp(values[lo]!, values[hi]!, pos - lo)
}

/**
 * Average a signal across a 0..1 span.
 *
 * A narrow canvas has far fewer columns than the signal has samples. Reading a
 * single point per column would alias — neighbouring columns land on unrelated
 * samples and the trace turns to noise. Averaging over each column's own slice
 * downsamples honestly instead.
 */
export function averageAt(values: number[], t0: number, t1: number): number {
  const lo = clamp01(Math.min(t0, t1)) * (values.length - 1)
  const hi = clamp01(Math.max(t0, t1)) * (values.length - 1)
  const first = Math.floor(lo), last = Math.ceil(hi)
  if (last - first <= 1) return sampleAt(values, (t0 + t1) / 2)
  let sum = 0, n = 0
  for (let i = first; i <= last; i++) {
    sum += values[Math.min(values.length - 1, Math.max(0, i))]!
    n++
  }
  return sum / n
}
