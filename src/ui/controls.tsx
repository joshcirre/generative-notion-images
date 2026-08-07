import { useCallback, useEffect, useRef, useState } from 'react'

// Control language from the synth device in Will King's Patterns for Creativity
// (github.com/wking-io/patterns-for-creativity): a muted mono label over a
// hairline field, with the unit acting as a drag-scrubbable handle that lights
// up while it has focus.

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
const decimals = (step: number) => (String(step).split('.')[1]?.length ?? 0)

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="font-device text-[10px] tracking-wide text-muted uppercase">
      {children}
    </label>
  )
}

export function Scrub({
  label, value, onChange, min, max, step = 1, unit = '',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}) {
  const [dragging, setDragging] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const startRef = useRef(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = `p-${label.toLowerCase().replace(/\W+/g, '-')}`
  const dp = decimals(step)

  const snap = useCallback(
    (v: number) => clamp(Math.round(v / step) * step, min, max),
    [max, min, step],
  )

  useEffect(() => {
    if (!dragging) return
    // A full sweep of the range takes about 220px of travel, so every control
    // feels the same regardless of the units behind it.
    const perPixel = (max - min) / 220
    const onMove = (e: MouseEvent) => {
      startRef.current = clamp(startRef.current + e.movementX * perPixel, min, max)
      onChange(snap(startRef.current))
    }
    const onUp = () => {
      setDragging(false)
      if (document.pointerLockElement) document.exitPointerLock()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging, max, min, onChange, snap])

  const beginDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    startRef.current = value
    setDragging(true)
    void (e.currentTarget as HTMLElement).requestPointerLock?.()
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={`group/field flex border bg-white text-right text-[11px] select-none ${
          dragging ? 'border-primary' : 'border-sand-7 focus-within:border-primary'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          className="w-full min-w-0 flex-1 bg-transparent px-1.5 py-0.5 font-device text-ink focus:outline-none"
          value={draft ?? value.toFixed(dp)}
          onChange={e => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(clamp(n, min, max))
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={e => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            e.preventDefault()
            const mult = e.shiftKey ? 10 : 1
            onChange(snap(value + (e.key === 'ArrowUp' ? step : -step) * mult))
          }}
        />
        <div
          onMouseDown={beginDrag}
          title="Drag to scrub"
          className={`flex cursor-ew-resize items-center border-l px-1.5 py-0.5 font-device text-[10px] ${
            dragging
              ? 'border-primary bg-primary text-white'
              : 'border-sand-7 text-muted group-focus-within/field:border-primary group-focus-within/field:bg-primary group-focus-within/field:text-white'
          }`}
        >
          {unit || '↔'}
        </div>
      </div>
    </div>
  )
}

/** Wide slider with bracket end-caps, for the parameters worth sweeping. */
export function BracketSlider({
  label, value, onChange, min, max, step = 1, format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-device text-[10px] text-ink">{format ? format(value) : value}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-device text-[10px] text-sand-8">[-]</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none bg-sand-4 shadow-[inset_0_0_0_1px_rgba(33,32,28,0.18)] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-white"
        />
        <span className="font-device text-[10px] text-sand-8">[+]</span>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  label, value, options, onChange, columns,
}: {
  label?: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  columns?: number
}) {
  const cols = columns ?? options.length
  // Pad the last row so a partial row doesn't leave the chassis showing through
  // the grid gaps.
  const fillers = (cols - (options.length % cols)) % cols
  return (
    <div className="flex flex-col gap-1">
      {label ? <Label>{label}</Label> : null}
      <div
        className="grid gap-px border border-sand-7 bg-sand-6"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-1 py-0.5 font-device text-[10px] capitalize transition-colors ${
              value === opt ? 'bg-primary text-white' : 'bg-white text-muted hover:bg-sand-3'
            }`}
          >
            {opt}
          </button>
        ))}
        {Array.from({ length: fillers }, (_, i) => (
          <div key={`filler-${i}`} className="bg-white" />
        ))}
      </div>
    </div>
  )
}

export function TextField({
  label, value, onChange, placeholder, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  const id = `t-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        spellCheck={false}
        autoComplete="off"
        onChange={e => onChange(e.target.value)}
        className="border border-sand-7 bg-white px-2 py-1.5 font-device text-sm font-bold tracking-widest text-ink uppercase focus:border-primary focus:outline-none"
      />
    </div>
  )
}

/**
 * The 5x7 block editor from the original tool. It only appears when the text is
 * a single glyph, because that is the only case a mask can address without
 * ambiguity.
 */
export function GlyphEditor({
  mask, onChange, onReset, dirty, swatch,
}: {
  mask: string
  onChange: (mask: string) => void
  onReset: () => void
  dirty: boolean
  swatch: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <Label>Blocks</Label>
        {dirty ? (
          <button
            type="button"
            onClick={onReset}
            className="font-device text-[10px] text-primary uppercase hover:underline"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="grid w-max grid-cols-5 gap-px border border-sand-7 bg-sand-6">
        {[...mask].map((bit, i) => (
          <button
            key={i}
            type="button"
            aria-label={`block ${(i % 5) + 1},${Math.floor(i / 5) + 1}`}
            onClick={() => onChange(mask.slice(0, i) + (bit === '1' ? '0' : '1') + mask.slice(i + 1))}
            className="size-5 transition-colors"
            style={{ background: bit === '1' ? swatch : 'rgba(255,255,255,0.88)' }}
          />
        ))}
      </div>
    </div>
  )
}

export function ColorField({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5 border border-sand-7 bg-white px-1 py-0.5">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="size-5 cursor-pointer border-0 bg-transparent p-0"
          aria-label={label}
        />
        <span className="font-device text-[10px] tracking-tight text-muted uppercase">{value}</span>
      </div>
    </div>
  )
}

export function Toggle({
  label, checked, onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 self-start font-device text-[10px] tracking-wide text-muted uppercase"
    >
      <span
        className={`grid size-3.5 place-items-center border ${
          checked ? 'border-primary bg-primary text-white' : 'border-sand-7 bg-white'
        }`}
      >
        {checked ? '✕' : ''}
      </span>
      {label}
    </button>
  )
}

export function Button({
  children, onClick, variant = 'default', title,
}: PropsWithChildrenButton) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white hover:bg-primary-deep border-primary'
      : 'bg-white text-ink hover:bg-sand-3 border-sand-7'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`border px-2.5 py-1.5 font-device text-[10px] tracking-wide uppercase transition-colors ${styles}`}
    >
      {children}
    </button>
  )
}

type PropsWithChildrenButton = {
  children: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'primary'
  title?: string
}
