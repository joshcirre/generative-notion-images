import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'

// Chassis parts, following the synth device in Will King's Patterns for
// Creativity (github.com/wking-io/patterns-for-creativity), wearing Laravel's
// brand red: a face textured with fractal noise, bevelled light from the
// top-left and shadow to the bottom-right, and a dark inset screen under a
// glare.

export function DeviceNoiseFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <linearGradient id="hole-highlight" x1="1.5" y1="1.5" x2="6.5" y2="6.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#e9e8e6" />
      </linearGradient>
      <linearGradient id="hole" x1="4" y1="1" x2="4" y2="7" gradientUnits="userSpaceOnUse">
        <stop stopColor="#bcbbb5" />
        <stop offset="1" stopColor="#dad9d6" />
      </linearGradient>
      <pattern id="grille" patternUnits="userSpaceOnUse" width="8" height="8">
        <circle cx="4" cy="4" r="3.5" fill="url(#hole-highlight)" />
        <circle cx="4" cy="4" r="3" fill="url(#hole)" />
      </pattern>
      <filter id="device-noise">
        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="6" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="0.5" />
          <feFuncG type="gamma" amplitude="1" exponent="0.5" />
          <feFuncB type="gamma" amplitude="1" exponent="0.5" />
          <feFuncA type="linear" slope="0.8" intercept="0.1" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

export function DeviceBody({ children }: PropsWithChildren) {
  return <div className="relative isolate flex min-h-0 flex-1 flex-col">{children}</div>
}

export function DeviceFace({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl bg-chassis bg-gradient-to-br from-sand-1 to-sand-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-white/60 to-white/0 to-50%" />
      <div className="device-noise pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      <div className="pointer-events-none absolute inset-0 rounded-xl border-r-2 border-b-2 border-black/10" />
      <div className="pointer-events-none absolute inset-0 rounded-xl border-t-2 border-l-2 border-white" />
    </div>
  )
}

/** The dark inset panel the artwork sits in. */
export function DeviceScreen({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div className="relative flex max-h-full w-full flex-col" style={style}>
      <div className="pointer-events-none absolute top-0 -right-0.5 -bottom-0.5 left-0 rounded-[10px] bg-gradient-to-tl from-white/60 to-white/0" />
      <div className="pointer-events-none absolute -top-0.5 right-0 bottom-0 -left-0.5 rounded-[10px] bg-gradient-to-br from-stone-950/30 to-stone-950/0" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-stone-950 p-1">
        <div className="bg-glare pointer-events-none absolute inset-0 z-40 rounded-lg" />
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[5px]">{children}</div>
        <div className="pointer-events-none absolute inset-1 rounded border-t-4 border-l-4 border-t-stone-300/15 border-l-stone-300/15" />
        <div className="pointer-events-none absolute inset-[5px] rounded border-t border-l border-t-stone-200/50 border-l-stone-200/50" />
      </div>
    </div>
  )
}

export function StatusBar({ children, top = false }: PropsWithChildren<{ top?: boolean }>) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-1 font-device text-[10px] tracking-wide text-muted ${
        top ? 'border-b border-dashed border-sand-6 pb-2' : 'border-t border-dashed border-sand-6 pt-2'
      }`}
    >
      {children}
    </div>
  )
}

/** The punched speaker grille that separates the screen from the controls. */
export function DeviceGrille({ vertical = false }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="relative w-3.5 shrink-0 border-l border-sand-6">
        <div className="h-full border-l border-white">
          <svg width="12" height="100%" className="block" preserveAspectRatio="none" aria-hidden>
            <rect width="12" height="100%" fill="url(#grille)" />
          </svg>
        </div>
      </div>
    )
  }
  return (
    <div className="relative shrink-0 border-t border-sand-6">
      <div className="border-t border-white">
        <svg height="14" width="100%" className="block" preserveAspectRatio="none" aria-hidden>
          <rect width="100%" height="14" fill="url(#grille)" />
        </svg>
      </div>
    </div>
  )
}

/** A labelled group of controls, framed like a section of a hardware panel. */
export function Rack({ label, children }: PropsWithChildren<{ label: string; children: ReactNode }>) {
  return (
    <section className="flex min-w-0 flex-col gap-1 rounded-md border border-sand-6 bg-sand-3 p-2">
      <h2 className="font-pixel text-[9px] tracking-[0.18em] text-muted uppercase">{label}</h2>
      {children}
    </section>
  )
}
