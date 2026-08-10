import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BACKDROPS, BACKGROUND_LAYERS, BASELINES, GLYPH_SOURCES, IMAGE_CHANNELS, LIMITS,
  MAX_TEXT, MODES, PALETTES, RAMPS, RUNS, SEAMS, SHAPES, SIGNAL_MODES, SURFACES,
  SYMMETRIES,
  buildScene, fromQuery, generateMask, glyphMask, normalize, preset, randomize,
  soleGlyph, surfacePreset, toQuery, tint, zoomFloor,
  type ImageSample, type Params,
} from '../scene'
import {
  DeviceBody, DeviceFace, DeviceGrille, DeviceNoiseFilter, DeviceScreen, Rack, StatusBar,
} from './device'
import {
  BracketSlider, Button, ColorField, GlyphEditor, Scrub, Segmented, TextField, Toggle,
} from './controls'
import { useMicSignal } from './useMicSignal'
import { exportPNG, exportSVG } from './export'
import { sampleImage } from './image'
import { AgentConnectDialog } from './agent-connect'

const pct = (v: number) => `${v}%`
const EXPORT_WIDTHS = (aspect: number) => (aspect === 1 ? [512, 1024, 2048] : [1500, 3000])
const MAX_ZOOM = LIMITS.zoom![1]

export default function App() {
  const [params, setParams] = useState<Params>(() =>
    normalize({ ...preset('terrain'), ...fromQuery(window.location.hash) }))
  const [guides, setGuides] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageSample, setImageSample] = useState<ImageSample | null>(null)
  const [imageError, setImageError] = useState('')
  const [agentConnectOpen, setAgentConnectOpen] = useState(false)

  const set = useCallback(<K extends keyof Params>(key: K, value: Params[K]) => {
    setParams(prev => normalize({ ...prev, [key]: value }))
  }, [])

  const setSignal = useCallback((encoded: string) => {
    setParams(prev => normalize({ ...prev, signal: encoded, surface: 'voice' }))
  }, [])
  const mic = useMicSignal(setSignal)

  useEffect(() => {
    let live = true
    if (!imageFile) {
      setImageSample(null)
      return
    }
    setImageError('')
    void sampleImage(imageFile, params.imageResolution).then(
      sample => { if (live) setImageSample(sample) },
      error => { if (live) setImageError(error instanceof Error ? error.message : 'Could not read that image.') },
    )
    return () => { live = false }
  }, [imageFile, params.imageResolution])

  // Switching composition loads that mode's preset but keeps the choices that
  // aren't really about the composition — seed, palette, material, canvas.
  const setMode = useCallback((mode: Params['mode']) => {
    setParams(prev => normalize({ ...preset(mode), ...carryOver(prev), mode }))
  }, [])

  const scene = useMemo(() => buildScene(params, imageSample), [params, imageSample])
  // Guides belong to the preview only — never to what gets exported. They
  // describe a Notion cover, so a square icon canvas has no use for them.
  const preview = useMemo(
    () => (guides && params.aspect !== 1
      ? scene.svg.replace('</svg>', cropGuides(scene.view) + '</svg>')
      : scene.svg),
    [scene, guides, params.aspect])
  const query = useMemo(() => toQuery(params), [params])
  // Derived from the same query the effect below writes, rather than read back
  // off `location`: the effect runs after the render, so reading it here would
  // always show the previous design's URL.
  const href = `${window.location.origin}${window.location.pathname}${query ? `#${query}` : ''}`

  useEffect(() => {
    window.history.replaceState(null, '', query ? `#${query}` : window.location.pathname)
  }, [query])

  // Wheel and trackpad pinch over the artwork zoom the canvas. Registered
  // natively rather than through React, whose wheel listener is passive: a pinch
  // that goes un-prevented zooms the whole browser page instead. Zoom steps
  // geometrically so a notch feels the same however far in you already are, and
  // always moves at least a point so a slow trackpad drag isn't rounded away.
  const artwork = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = artwork.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setParams(prev => {
        const rate = e.ctrlKey ? 0.01 : 0.0015 // pinch reports far smaller deltas
        const step = Math.max(1, Math.round(prev.zoom * Math.abs(Math.expm1(-e.deltaY * rate))))
        return normalize({ ...prev, zoom: prev.zoom + (e.deltaY < 0 ? step : -step) })
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const surface = params.surface
  const isLetters = surface === 'letters'
  const isImage = surface === 'image'
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
    : isImage ? imageFile?.name.replace(/\.[^.]+$/, '').replace(/\W+/g, '-').toLowerCase() || 'image'
    : `${surface === 'pattern' ? params.mode : surface}-${params.seed}`

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-1.5 sm:p-3">
      <DeviceNoiseFilter />
      <DeviceBody>
        <DeviceFace>
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-4">
            <StatusBar top>
              <span className="font-pixel text-[11px] tracking-[0.14em] text-ink">GENERATIVE DESIGNS</span>
              <span className="hidden sm:inline">ISOMETRIC PLOTTER</span>
              <span className="ml-auto tabular-nums">{describe(params).toUpperCase()}</span>
              <span className="tabular-nums">{scene.faces.toLocaleString()} FACES</span>
              <span className="hidden tabular-nums sm:inline">PEAK {scene.peak}</span>
              <span className="tabular-nums">ZOOM {params.zoom}%</span>
            </StatusBar>

            <div className="flex min-h-0 flex-1 flex-col gap-2 wide:flex-row wide:gap-3">
              {/* Artwork keeps its natural height on mobile and flexes on desktop. */}
              <div className="flex min-w-0 shrink-0 flex-col gap-2 wide:min-h-0 wide:flex-1">
            {/* The artwork letterboxes itself inside the screen via the SVG's
                own preserveAspectRatio, so the panel fits any viewport without
                measuring anything. */}
            <div ref={artwork} className="flex max-h-[34dvh] items-center wide:max-h-none wide:min-h-0 wide:flex-1">
              <DeviceScreen style={{ aspectRatio: String(params.aspect) }}>
                <div
                  title="Scroll to zoom"
                  className="checker h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </DeviceScreen>
            </div>

            <div className="flex shrink-0 flex-wrap items-end gap-2">
              <div className="w-full max-w-72 sm:w-72">
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
                  signal: prev.signal,
                  // Nor is the canvas you chose to look through.
                  aspect: prev.aspect, zoom: prev.zoom,
                  backgroundLayer: prev.backgroundLayer,
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

              <div className="hidden wide:flex"><DeviceGrille vertical /></div>
              <div className="wide:hidden"><DeviceGrille /></div>

              {/* Racks live beside the artwork rather than under it, so the
                  preview keeps most of the viewport. */}
              <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2 wide:w-[min(560px,46%)] wide:flex-none">
                <div className="flex min-w-0 flex-col gap-2">
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
                    <TextField label="Text" value={params.text} onChange={v => set('text', v)} placeholder="A–Z 0–9" maxLength={MAX_TEXT} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Segmented label="Baseline" value={params.baseline} options={BASELINES} onChange={v => set('baseline', v)} />
                    <Segmented label="Run" value={params.run} options={RUNS} onChange={v => set('run', v)} />
                  </div>
                  {/* Grid sends the whole word up one axis, so a phrase becomes a
                      long thin diagonal that has to shrink to fit. Worth saying
                      out loud rather than letting it look broken. */}
                  {params.baseline === 'grid' && params.text.trim().length > 3 ? (
                    <p className="font-device text-[10px] leading-relaxed text-primary">
                      Grid runs the word up one axis — long text becomes a thin
                      diagonal. Use Flat to fill a header.
                    </p>
                  ) : null}
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
              ) : isImage ? (
                <Rack label="Image mosaic">
                  <ImagePicker
                    file={imageFile}
                    sample={imageSample}
                    error={imageError}
                    onChange={file => {
                      setImageFile(file)
                      setParams(prev => surfacePreset('image', prev))
                    }}
                  />
                  <Segmented
                    label="Read channel"
                    value={params.imageChannel}
                    options={IMAGE_CHANNELS}
                    onChange={v => set('imageChannel', v)}
                    columns={4}
                  />
                  <p className="font-device text-[10px] leading-relaxed text-muted">
                    Auto uses transparency when present, or contrast from the image edge.
                    Dark and Light are useful for flat artwork on a solid background.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Scrub label="Resolution" value={params.imageResolution} onChange={v => set('imageResolution', v)} min={8} max={48} />
                    <Scrub label="Threshold" value={params.imageThreshold} onChange={v => set('imageThreshold', v)} min={0} max={100} unit="%" />
                    <Scrub label="Depth" value={params.depth} onChange={v => set('depth', v)} min={1} max={5} />
                    <Scrub label="Fit" value={params.fit} onChange={v => set('fit', v)} min={10} max={95} unit="%" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Segmented label="Run" value={params.run} options={RUNS} onChange={v => set('run', v)} />
                    <Toggle label="Invert" checked={!!params.imageInvert} onChange={v => set('imageInvert', v ? 1 : 0)} />
                  </div>
                  <p className="font-device text-[10px] leading-relaxed text-muted">
                    The file is sampled in this tab only. It is never uploaded or added to the share URL.
                  </p>
                </Rack>
              ) : isSignal ? (
                <Rack label={surface === 'voice' ? 'Voice' : 'Text'}>
                  {surface === 'voice' ? (
                    <VoicePanel mic={mic} hasSignal={!!params.signal} />
                  ) : (
                    <>
                      <TextField label="Source text" value={params.text} onChange={v => set('text', v)} maxLength={MAX_TEXT} />
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
              </Rack>

                </div>
                <div className="flex min-w-0 flex-col gap-2">
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
                <Segmented label="Palette" value={params.palette} options={PALETTES} onChange={v => set('palette', v)} columns={5} />
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

              {/* ---- filters --------------------------------------------- */}
              <Rack label="Filters">
                <p className="font-device text-[10px] leading-relaxed text-muted">
                  Finishing treatments apply across every surface and stay reproducible in shared links.
                </p>
                <BracketSlider label="Noise" value={params.grain} onChange={v => set('grain', v)} min={0} max={100} format={pct} />
                <BracketSlider label="Glass" value={params.glass} onChange={v => set('glass', v)} min={0} max={100} format={pct} />
                {params.glass > 0 ? (
                  <BracketSlider label="Glass scale" value={params.glassScale} onChange={v => set('glassScale', v)} min={0} max={100} format={pct} />
                ) : null}
                <BracketSlider label="Vignette" value={params.vignette} onChange={v => set('vignette', v)} min={0} max={100} format={pct} />
                <BracketSlider label="Edge blur" value={params.vignetteBlur} onChange={v => set('vignetteBlur', v)} min={0} max={100} format={pct} />
              </Rack>

              {/* ---- canvas ------------------------------------------------ */}
              <Rack label="Canvas">
                {/* Named for what Notion calls them rather than by ratio. Other
                    ratios stay reachable through the URL and the CLI. */}
                <Segmented
                  label="Format"
                  value={params.aspect === 1 ? 'icon' : 'header'}
                  options={['header', 'icon'] as const}
                  labels={{ header: 'Header', icon: 'Icon' }}
                  onChange={v => set('aspect', v === 'icon' ? 1 : 2.5)}
                />
                <p className="font-device text-[10px] leading-relaxed text-muted">
                  {params.aspect === 1
                    ? 'Page icon — square. Exports 512 / 1024 / 2048.'
                    : `Page cover — ${params.aspect}:1. Exports 1500×${Math.round(1500 / params.aspect)}.`}
                </p>
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
                <Segmented
                  label="Background layer"
                  value={params.backgroundLayer}
                  options={BACKGROUND_LAYERS}
                  onChange={v => set('backgroundLayer', v)}
                  columns={4}
                />
                {params.backgroundLayer === 'pattern' || params.backgroundLayer === 'both' ? (
                  <>
                    <p className="font-device text-[10px] leading-relaxed text-muted">
                      A sparse field uses the same isometric language behind the surface,
                      while Edge reach keeps the center clear for letters.
                    </p>
                    <Segmented
                      label="Pattern composition"
                      value={params.backgroundPatternMode}
                      options={MODES}
                      onChange={v => set('backgroundPatternMode', v)}
                      columns={3}
                    />
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Scrub label="Pattern seed" value={params.backgroundPatternSeed} onChange={v => set('backgroundPatternSeed', v)} min={1} max={99999} />
                      </div>
                      <Button
                        onClick={() => set('backgroundPatternSeed', Math.floor(Math.random() * 99999) + 1)}
                        title="New background pattern"
                      >
                        Shuffle pattern
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Scrub label="Pattern scale" value={params.backgroundPatternGrid} onChange={v => set('backgroundPatternGrid', v)} min={4} max={26} />
                      <Scrub label="Pattern height" value={params.backgroundPatternHeight} onChange={v => set('backgroundPatternHeight', v)} min={1} max={8} />
                      <Scrub label="Pattern detail" value={params.backgroundPatternDetail} onChange={v => set('backgroundPatternDetail', v)} min={1} max={100} />
                      <Scrub label="Pattern warp" value={params.backgroundPatternWarp} onChange={v => set('backgroundPatternWarp', v)} min={0} max={100} unit="%" />
                    </div>
                    <BracketSlider label="Pattern density" value={params.backgroundPatternCoverage} onChange={v => set('backgroundPatternCoverage', v)} min={0} max={100} format={pct} />
                    <BracketSlider label="Edge reach" value={params.backgroundPatternReach} onChange={v => set('backgroundPatternReach', v)} min={5} max={85} format={pct} />
                    <BracketSlider label="Pattern opacity" value={params.backgroundPatternOpacity} onChange={v => set('backgroundPatternOpacity', v)} min={0} max={100} format={pct} />
                  </>
                ) : null}
                {params.backgroundLayer === 'grid' || params.backgroundLayer === 'both' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Scrub label="Grid size" value={params.gridSpacing} onChange={v => set('gridSpacing', v)} min={2} max={30} unit="%" />
                      <Scrub label="Direction" value={params.gridAngle} onChange={v => set('gridAngle', v)} min={-180} max={180} unit="°" />
                      <Scrub label="Skew" value={params.gridSkew} onChange={v => set('gridSkew', v)} min={15} max={165} unit="°" />
                      <Scrub label="Fade dir." value={params.gridFadeAngle} onChange={v => set('gridFadeAngle', v)} min={0} max={360} unit="°" />
                    </div>
                    <BracketSlider label="Grid opacity" value={params.gridOpacity} onChange={v => set('gridOpacity', v)} min={0} max={100} format={pct} />
                    <BracketSlider label="Directional fade" value={params.gridFade} onChange={v => set('gridFade', v)} min={0} max={100} format={pct} />
                    <ColorField label="Grid color" value={params.gridColor} onChange={v => set('gridColor', v)} />
                  </>
                ) : null}
                {/* Zoom and the two nudges are one group: where the canvas sits
                    over the artwork, as opposed to what the artwork is. */}
                <div className="grid grid-cols-2 items-end gap-2">
                  <Scrub
                    label="Zoom"
                    value={params.zoom}
                    onChange={v => set('zoom', v)}
                    min={zoomFloor(params)}
                    max={MAX_ZOOM}
                    step={5}
                    unit="%"
                  />
                  <Button onClick={() => setParams(p => normalize({ ...p, zoom: 100, shiftX: 0, shiftY: 0 }))}>
                    Reset view
                  </Button>
                </div>
                <p className="font-device text-[10px] leading-relaxed text-muted">
                  {params.surface === 'letters' || params.surface === 'image'
                    ? 'Crops into the wordmark past what Fit allows. Scroll over the artwork to zoom.'
                    : `Blocks keep their size, so the canvas holds ${describeSpan(params)}. Scroll over the artwork to zoom.`}
                </p>
                <BracketSlider label="Nudge X" value={params.shiftX} onChange={v => set('shiftX', v)} min={-60} max={60} format={pct} />
                <BracketSlider label="Nudge Y" value={params.shiftY} onChange={v => set('shiftY', v)} min={-60} max={60} format={pct} />
              </Rack>
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-dashed border-sand-6 pt-2 font-device text-[10px] tracking-wide text-muted">
              <div className="divide-y divide-sand-6 overflow-hidden rounded border border-sand-6 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <CopyLine label="URL" value={href} />
                <CopyLine label="CLI" value={`npm run generate -- --png --params "${query}"`} />
              </div>

              <div className="mt-2 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setAgentConnectOpen(true)}
                  className="inline-flex min-h-7 items-center gap-2 border border-primary bg-primary px-3 font-pixel text-[9px] tracking-[0.1em] text-white uppercase shadow-[2px_2px_0_#c42602] transition-[background-color,transform,box-shadow] hover:bg-primary-deep active:translate-x-px active:translate-y-px active:shadow-none"
                >
                  <span aria-hidden>↗</span>
                  Connect agent
                </button>

                <nav className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" aria-label="Project links">
                  <a
                    className="font-bold text-ink hover:text-primary"
                    href="https://github.com/joshcirre/generative-notion-images"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GITHUB + CLI DOCS ↗
                  </a>
                  <span className="text-sand-8" aria-hidden>/</span>
                  <a
                    className="hover:text-primary"
                    href="https://github.com/wking-io/patterns-for-creativity"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ORIGINAL INSPIRATION ↗
                  </a>
                </nav>
              </div>
            </footer>
          </div>
        </DeviceFace>
      </DeviceBody>
      <AgentConnectDialog open={agentConnectOpen} onClose={() => setAgentConnectOpen(false)} />
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

/** Blocks across the canvas height once zoom is folded in — the plain-language
 *  version of what pulling back actually does to a field. */
function describeSpan(p: Params): string {
  const n = Math.round(p.grid / (p.zoom / 100))
  return `${n} block${n === 1 ? '' : 's'} across its height`
}

function describe(p: Params): string {
  if (p.surface === 'letters') return `letters / ${p.glyphSource} / ${p.baseline}`
  if (p.surface === 'image') return `image / ${p.imageChannel}`
  if (p.surface === 'text') return `text / ${p.signalMode}`
  if (p.surface === 'voice') return `voice / ${p.signalMode}`
  return `${p.mode} / ${p.shape}`
}

function ImagePicker({
  file, sample, error, onChange,
}: {
  file: File | null
  sample: ImageSample | null
  error: string
  onChange: (file: File) => void
}) {
  const [dragging, setDragging] = useState(false)
  const take = (files: FileList | null) => {
    const next = files?.[0]
    if (next) onChange(next)
  }
  return (
    <label
      onDragEnter={e => { e.preventDefault(); setDragging(true) }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed px-3 py-4 text-center transition-colors ${
        dragging ? 'border-primary bg-red-50' : 'border-sand-7 bg-white hover:bg-sand-3'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { take(e.target.files); e.currentTarget.value = '' }}
      />
      <span className="font-pixel text-[10px] tracking-wide text-ink">
        {file ? file.name : 'DROP IMAGE / CHOOSE FILE'}
      </span>
      <span className={`font-device text-[10px] ${error ? 'font-bold text-primary' : 'text-muted'}`}>
        {error || (sample ? `${sample.width}×${sample.height} local sample` : 'PNG, JPG, WebP, SVG')}
      </span>
    </label>
  )
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
      title={`Copy ${label}: ${value}`}
      aria-label={`Copy full ${label}`}
      className="group grid min-h-8 w-full min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center text-left transition-colors hover:bg-white"
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
    >
      <span className="self-stretch border-r border-sand-6 bg-sand-3 px-2 py-2 font-pixel text-[8px] tracking-[0.12em] text-ink">{label}</span>
      <span className="min-w-0 px-3 text-[9px] opacity-70 sm:text-[10px]">
        <span className="block max-w-[min(58vw,640px)] truncate">{value}</span>
      </span>
      <span className="mr-2 border border-sand-7 bg-chassis px-1.5 py-0.5 text-[8px] text-muted transition-colors group-hover:border-primary group-hover:text-primary">
        {copied ? 'COPIED ✓' : 'COPY'}
      </span>
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
