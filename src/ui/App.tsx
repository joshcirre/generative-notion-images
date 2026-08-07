import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BACKDROPS, BASELINES, GLYPH_SOURCES, MODES, PALETTES, RAMPS, RUNS,
  SEAMS, SHAPES, SIGNAL_MODES, SURFACES, SYMMETRIES,
  buildScene, fromQuery, generateMask, glyphMask, normalize, preset, randomize,
  soleGlyph, surfacePreset, toQuery, tint,
  type Params,
} from '../scene'
import {
  DeviceBody, DeviceFace, DeviceGrille, DeviceNoiseFilter, DeviceScreen, Rack, StatusBar,
} from './device'
import {
  BracketSlider, Button, ColorField, GlyphEditor, Scrub, Segmented, TextField, Toggle,
} from './controls'
import { useMicSignal } from './useMicSignal'
import { exportPNG, exportSVG } from './export'

const pct = (v: number) => `${v}%`
const EXPORT_WIDTHS = (aspect: number) => (aspect === 1 ? [512, 1024, 2048] : [1500, 3000])

export default function App() {
  const [params, setParams] = useState<Params>(() =>
    normalize({ ...preset('terrain'), ...fromQuery(window.location.hash) }))
  const [guides, setGuides] = useState(true)

  const set = useCallback(<K extends keyof Params>(key: K, value: Params[K]) => {
    setParams(prev => normalize({ ...prev, [key]: value }))
  }, [])

  const setSignal = useCallback((encoded: string) => {
    setParams(prev => normalize({ ...prev, signal: encoded, surface: 'voice' }))
  }, [])
  const mic = useMicSignal(setSignal)

  // Switching composition loads that mode's preset but keeps the choices that
  // aren't really about the composition — seed, palette, material, canvas.
  const setMode = useCallback((mode: Params['mode']) => {
    setParams(prev => normalize({ ...preset(mode), ...carryOver(prev), mode }))
  }, [])

  const scene = useMemo(() => buildScene(params), [params])
  // Guides belong to the preview only — never to what gets exported. They
  // describe a Notion cover, so a square icon canvas has no use for them.
  const preview = useMemo(
    () => (guides && params.aspect !== 1
      ? scene.svg.replace('</svg>', cropGuides(scene.view) + '</svg>')
      : scene.svg),
    [scene, guides, params.aspect])
  const query = useMemo(() => toQuery(params), [params])

  useEffect(() => {
    window.history.replaceState(null, '', query ? `#${query}` : window.location.pathname)
  }, [query])

  const surface = params.surface
  const isLetters = surface === 'letters'
  const isSignal = surface === 'text' || surface === 'voice'
  const generated = params.glyphSource === 'generated'

  // The block editor addresses one glyph: a single typed character, or the
  // generated mark.
  const sole = soleGlyph(params.text)
  const activeMask = isLetters
    ? generated
      ? params.custom || generateMask(params.seed, params.glyphDensity, params.glyphSymmetry)
      : sole ? params.custom || glyphMask(sole) || '' : ''
    : ''

  const stamp = isLetters
    ? params.text.toLowerCase().replace(/\W+/g, '') || 'mark'
    : `${surface === 'pattern' ? params.mode : surface}-${params.seed}`

  return (
    <div className="flex h-screen flex-col overflow-hidden p-2 sm:p-3">
      <DeviceNoiseFilter />
      <DeviceBody>
        <DeviceFace>
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:p-4">
            <StatusBar top>
              <span className="font-pixel text-[11px] tracking-[0.14em] text-ink">GENERATIVE DESIGNS</span>
              <span className="hidden sm:inline">ISOMETRIC PLOTTER</span>
              <span className="ml-auto tabular-nums">{describe(params).toUpperCase()}</span>
              <span className="tabular-nums">{scene.faces.toLocaleString()} FACES</span>
              <span className="tabular-nums">PEAK {scene.peak}</span>
            </StatusBar>

            <div className="flex min-h-0 flex-1 gap-3">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {/* The artwork letterboxes itself inside the screen via the SVG's
                own preserveAspectRatio, so the panel fits any viewport without
                measuring anything. */}
            <div className="flex min-h-0 flex-1 items-center">
              <DeviceScreen style={{ aspectRatio: String(params.aspect) }}>
                <div
                  className="checker h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </DeviceScreen>
            </div>

            <div className="flex shrink-0 flex-wrap items-end gap-2">
              <div className="w-56">
                <Segmented
                  label="Surface"
                  value={surface}
                  options={SURFACES}
                  onChange={v => setParams(prev => surfacePreset(v, prev))}
                />
              </div>
              <div className="w-20">
                <Scrub label="Seed" value={params.seed} onChange={v => set('seed', v)} min={1} max={99999} />
              </div>
              <Button onClick={() => set('seed', params.seed + 1)} title="Next seed">+1</Button>
              <Button
                variant="primary"
                onClick={() => setParams(prev => normalize({
                  ...randomize(Math.floor(Math.random() * 99999) + 1, prev.surface),
                  // Content is not style: what you typed, drew or recorded stays.
                  surface: prev.surface, text: prev.text, custom: prev.custom,
                  signal: prev.signal, aspect: prev.aspect,
                }))}
              >
                ⚡ Shuffle
              </Button>
              <Toggle label="Guides" checked={guides} onChange={setGuides} />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {EXPORT_WIDTHS(params.aspect).map(w => {
                  const h = Math.round(w / params.aspect)
                  return (
                    <Button key={w} onClick={() => exportPNG(scene.svg, w, h, `${stamp}-${w}x${h}.png`)}>
                      PNG {w}
                    </Button>
                  )
                })}
                <Button
                  onClick={() => {
                    const w = EXPORT_WIDTHS(params.aspect)[0]!
                    exportSVG(scene.svg, w, Math.round(w / params.aspect), `${stamp}.svg`)
                  }}
                >
                  SVG
                </Button>
              </div>
            </div>

              </div>

              <DeviceGrille vertical />

              {/* Racks live beside the artwork rather than under it, so the
                  preview keeps most of the viewport. */}
              <div className="grid w-[min(560px,46%)] shrink-0 grid-cols-2 gap-2">
                <div className="flex min-h-0 flex-col gap-2">
              {/* ---- source ------------------------------------------------ */}
              {isLetters ? (
                <Rack label="Type">
                  <Segmented label="Glyph" value={params.glyphSource} options={GLYPH_SOURCES} onChange={v => set('glyphSource', v)} />
                  {generated ? (
                    <>
                      <Segmented label="Symmetry" value={params.glyphSymmetry} options={SYMMETRIES} onChange={v => set('glyphSymmetry', v)} columns={3} />
                      <BracketSlider label="Density" value={params.glyphDensity} onChange={v => set('glyphDensity', v)} min={10} max={90} format={pct} />
                      <p className="font-device text-[10px] leading-relaxed text-muted">
                        The mark comes from the seed. Nudge the seed for a new one, then
                        edit blocks below to finish it.
                      </p>
                    </>
                  ) : (
                    <TextField label="Text" value={params.text} onChange={v => set('text', v)} placeholder="A–Z 0–9" maxLength={12} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Segmented label="Baseline" value={params.baseline} options={BASELINES} onChange={v => set('baseline', v)} />
                    <Segmented label="Run" value={params.run} options={RUNS} onChange={v => set('run', v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Scrub label="Depth" value={params.depth} onChange={v => set('depth', v)} min={1} max={5} />
                    <Scrub label="Track" value={params.tracking} onChange={v => set('tracking', v)} min={0} max={6} />
                    <Scrub label="Fit" value={params.fit} onChange={v => set('fit', v)} min={10} max={95} unit="%" />
                  </div>
                  {activeMask ? (
                    <GlyphEditor
                      mask={activeMask}
                      dirty={!!params.custom}
                      swatch={params.colorB}
                      onChange={m => set('custom', m)}
                      onReset={() => set('custom', '')}
                    />
                  ) : (
                    <p className="font-device text-[10px] text-muted">
                      Type a single character to edit its blocks by hand.
                    </p>
                  )}
                </Rack>
              ) : isSignal ? (
                <Rack label={surface === 'voice' ? 'Voice' : 'Text'}>
                  {surface === 'voice' ? (
                    <VoicePanel mic={mic} hasSignal={!!params.signal} />
                  ) : (
                    <>
                      <TextField label="Source text" value={params.text} onChange={v => set('text', v)} maxLength={12} />
                      <p className="font-device text-[10px] leading-relaxed text-muted">
                        The words become the profile. Same text, same design — and
                        similar text lands somewhere similar.
                      </p>
                    </>
                  )}
                  <Segmented label="Trace" value={params.signalMode} options={SIGNAL_MODES} onChange={v => set('signalMode', v)} columns={3} />
                  <div className="grid grid-cols-3 gap-2">
                    <Scrub label="Band" value={params.signalBand} onChange={v => set('signalBand', v)} min={1} max={14} />
                    <Scrub label="Smooth" value={params.signalSmooth} onChange={v => set('signalSmooth', v)} min={0} max={12} />
                    <Scrub label="Height" value={params.height} onChange={v => set('height', v)} min={1} max={16} />
                  </div>
                  <BracketSlider label="Signal vs. noise" value={params.signalGain} onChange={v => set('signalGain', v)} min={0} max={100} format={pct} />
                  <div className="grid grid-cols-2 gap-2">
                    <Scrub label="Grid" value={params.grid} onChange={v => set('grid', v)} min={4} max={26} />
                    <Scrub label="Coverage" value={params.coverage} onChange={v => set('coverage', v)} min={0} max={100} unit="%" />
                  </div>
                </Rack>
              ) : (
                <Rack label="Field">
                  <Segmented label="Composition" value={params.mode} options={MODES} onChange={setMode} columns={3} />
                  <Segmented label="Shape" value={params.shape} options={SHAPES} onChange={v => set('shape', v)} columns={3} />
                  <div className="grid grid-cols-2 gap-2">
                    <Scrub label="Grid" value={params.grid} onChange={v => set('grid', v)} min={4} max={26} />
                    <Scrub label="Height" value={params.height} onChange={v => set('height', v)} min={1} max={16} />
                    <Scrub label="Detail" value={params.detail} onChange={v => set('detail', v)} min={1} max={100} />
                    <Scrub label="Octaves" value={params.octaves} onChange={v => set('octaves', v)} min={1} max={6} />
                    <Scrub label="Warp" value={params.warp} onChange={v => set('warp', v)} min={0} max={100} unit="%" />
                    <Scrub label="Jitter" value={params.jitter} onChange={v => set('jitter', v)} min={0} max={100} unit="%" />
                    <Scrub label="Steps" value={params.steps} onChange={v => set('steps', v)} min={0} max={8} />
                    <Scrub label="Float" value={params.floaters} onChange={v => set('floaters', v)} min={0} max={24} />
                  </div>
                  <BracketSlider label="Coverage" value={params.coverage} onChange={v => set('coverage', v)} min={0} max={100} format={pct} />
                </Rack>
              )}

              {/* ---- form -------------------------------------------------- */}
              <Rack label="Form & material">
                <div className="grid grid-cols-2 gap-2">
                  <Scrub label="Tilt" value={params.tilt} onChange={v => set('tilt', v)} min={12} max={45} unit="°" />
                  <Scrub label="Stretch" value={params.stretch} onChange={v => set('stretch', v)} min={30} max={220} unit="%" />
                  <Scrub label="Gap" value={params.gap} onChange={v => set('gap', v)} min={0} max={60} unit="%" />
                  <Scrub label="Seam" value={params.seam} onChange={v => set('seam', v)} min={0} max={6} step={0.5} />
                </div>
                <Segmented label="Seam style" value={params.seamStyle} options={SEAMS} onChange={v => set('seamStyle', v)} columns={4} />
                <BracketSlider label="Occlusion" value={params.occlusion} onChange={v => set('occlusion', v)} min={0} max={100} format={pct} />
                <BracketSlider label="Bevel" value={params.bevel} onChange={v => set('bevel', v)} min={0} max={100} format={pct} />
                <BracketSlider label="Grain" value={params.grain} onChange={v => set('grain', v)} min={0} max={100} format={pct} />
              </Rack>

                </div>
                <div className="flex min-h-0 flex-col gap-2">
              {/* ---- color ------------------------------------------------- */}
              <Rack label="Color">
                <div className="flex flex-wrap gap-1">
                  {RAMPS.map(r => (
                    <button
                      key={r.name}
                      type="button"
                      title={r.name}
                      onClick={() => setParams(p => normalize({
                        ...p, colorA: r.a, colorMid: r.mid, colorB: r.b,
                        bg1: tint(r.a, 0.82), bg2: tint(r.b, 0.8), frameColor: r.b,
                      }))}
                      className={`size-5 border ${
                        params.colorA === r.a && params.colorB === r.b
                          ? 'border-ink ring-1 ring-ink' : 'border-sand-7'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${r.a}, ${r.mid}, ${r.b})` }}
                    />
                  ))}
                </div>
                <Segmented label="Palette" value={params.palette} options={PALETTES} onChange={v => set('palette', v)} columns={4} />
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Ground" value={params.colorA} onChange={v => set('colorA', v)} />
                  <ColorField label="Peaks" value={params.colorB} onChange={v => set('colorB', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Scrub label="Curve" value={params.curve} onChange={v => set('curve', v)} min={20} max={320} unit="%" />
                  <Scrub label="Hue" value={params.hueShift} onChange={v => set('hueShift', v)} min={-180} max={180} unit="°" />
                  <Scrub label="Satur." value={params.saturation} onChange={v => set('saturation', v)} min={0} max={200} unit="%" />
                  <Scrub label="Light" value={params.light} onChange={v => set('light', v)} min={0} max={360} unit="°" />
                </div>
                <BracketSlider label="Face contrast" value={params.contrast} onChange={v => set('contrast', v)} min={0} max={220} format={pct} />
              </Rack>

              {/* ---- canvas ------------------------------------------------ */}
              <Rack label="Canvas">
                <Segmented
                  label="Aspect"
                  value={String(params.aspect)}
                  options={['1', '2.5', '3', '4'] as const}
                  onChange={v => set('aspect', Number(v))}
                  columns={4}
                />
                <Segmented label="Backdrop" value={params.backdrop} options={BACKDROPS} onChange={v => set('backdrop', v)} columns={3} />
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="BG from" value={params.bg1} onChange={v => set('bg1', v)} />
                  <ColorField label="BG to" value={params.bg2} onChange={v => set('bg2', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Scrub label="BG angle" value={params.bgAngle} onChange={v => set('bgAngle', v)} min={0} max={360} unit="°" />
                  <Scrub label="Inset" value={params.inset} onChange={v => set('inset', v)} min={0} max={20} unit="%" />
                  <Scrub label="Frame" value={params.frame} onChange={v => set('frame', v)} min={0} max={12} step={0.5} />
                  <ColorField label="Frame col" value={params.frameColor} onChange={v => set('frameColor', v)} />
                </div>
                <BracketSlider label="Nudge X" value={params.shiftX} onChange={v => set('shiftX', v)} min={-60} max={60} format={pct} />
                <BracketSlider label="Nudge Y" value={params.shiftY} onChange={v => set('shiftY', v)} min={-60} max={60} format={pct} />
              </Rack>
                </div>
              </div>
            </div>

            <StatusBar>
              <CopyLine label="URL" value={window.location.href} />
              <CopyLine label="CLI" value={`npm run generate -- --png --params "${query}"`} />
              <a
                className="ml-auto shrink-0 hover:text-primary"
                href="https://github.com/wking-io/patterns-for-creativity"
                target="_blank"
                rel="noreferrer"
              >
                GENERATOR INSPIRED BY WILL KING&rsquo;S PATTERNS FOR CREATIVITY ↗
              </a>
            </StatusBar>
          </div>
        </DeviceFace>
      </DeviceBody>
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Everything that survives a change of composition. */
function carryOver(p: Params): Partial<Params> {
  const { mode, ...rest } = p
  void mode
  return rest
}

function describe(p: Params): string {
  if (p.surface === 'letters') return `letters / ${p.glyphSource} / ${p.baseline}`
  if (p.surface === 'text') return `text / ${p.signalMode}`
  if (p.surface === 'voice') return `voice / ${p.signalMode}`
  return `${p.mode} / ${p.shape}`
}

function VoicePanel({
  mic, hasSignal,
}: {
  mic: ReturnType<typeof useMicSignal>
  hasSignal: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button variant={mic.recording ? 'default' : 'primary'} onClick={mic.recording ? mic.stop : mic.start}>
          {mic.recording ? '■ Stop' : '● Record'}
        </Button>
        <span className="font-device text-[10px] tabular-nums text-muted">
          {mic.recording ? `${mic.seconds.toFixed(1)}s / ${mic.maxSeconds}s` : hasSignal ? 'captured' : 'no signal'}
        </span>
      </div>
      {/* Live level, so you can tell the microphone is actually hearing you. */}
      <div className="h-1.5 w-full overflow-hidden bg-sand-4 shadow-[inset_0_0_0_1px_rgba(33,32,28,0.18)]">
        <div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${mic.level * 100}%` }} />
      </div>
      {mic.error ? (
        <p className="font-device text-[10px] font-bold text-primary">{mic.error}</p>
      ) : (
        <p className="font-device text-[10px] leading-relaxed text-muted">
          Speak while recording — the design follows your voice, then freezes into
          the URL. The audio itself is never kept.
        </p>
      )}
    </div>
  )
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="flex min-w-0 max-w-[38%] items-center gap-2 text-left hover:text-primary"
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
    >
      <span className="shrink-0 border border-sand-7 px-1">{copied ? 'COPIED' : label}</span>
      <span className="truncate opacity-70">{value}</span>
    </button>
  )
}

/** Notion crops covers vertically as the window widens, and floats the page
 *  icon over the bottom-left of the content column. */
function cropGuides({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const dash = h * 0.02
  return `<g fill="none" stroke="#17150f" stroke-opacity="0.4" ` +
    `stroke-width="${h * 0.005}" stroke-dasharray="${dash} ${dash}">` +
    `<rect x="${x + w * 0.02}" y="${y + h * 0.2}" width="${w * 0.96}" height="${h * 0.6}"/>` +
    `<circle cx="${x + w * 0.2}" cy="${y + h}" r="${w * 0.026}"/></g>`
}
