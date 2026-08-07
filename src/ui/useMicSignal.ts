import { useCallback, useEffect, useRef, useState } from 'react'
import { encodeSignal, normalizeSignal, resample } from '../scene'

const TICK_MS = 60
const MAX_SECONDS = 20

type Rig = {
  stream: MediaStream
  ctx: AudioContext
  analyser: AnalyserNode
  buffer: Float32Array
  timer: number
}

/**
 * Records from the microphone and freezes what it hears into an encoded signal.
 *
 * The design deliberately does not keep the audio: it accumulates loudness over
 * time, resamples that envelope to the fixed signal length, and hands back a
 * short string. Nothing downstream ever needs the microphone again — the
 * recording becomes a parameter like any other.
 *
 * `onSignal` fires on every tick, so the artwork animates while you speak.
 */
export function useMicSignal(onSignal: (encoded: string) => void) {
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const rig = useRef<Rig | null>(null)
  // Keeps the tick callback current without tearing down the recorder.
  const emit = useRef(onSignal)
  emit.current = onSignal

  const teardown = useCallback(() => {
    const r = rig.current
    if (!r) return
    rig.current = null
    clearInterval(r.timer)
    r.stream.getTracks().forEach(t => t.stop())
    void r.ctx.close().catch(() => {})
  }, [])

  const stop = useCallback(() => {
    teardown()
    setRecording(false)
    setLevel(0)
  }, [teardown])

  const start = useCallback(async () => {
    if (rig.current) return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(analyser)

      const buffer = new Float32Array(analyser.fftSize)
      const envelope: number[] = []

      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) sum += buffer[i]! * buffer[i]!
        const rms = Math.sqrt(sum / buffer.length)
        // Loudness is perceptual, so a square root opens up the quiet end.
        envelope.push(Math.sqrt(rms))
        setLevel(Math.min(1, rms * 4))
        setSeconds(+(envelope.length * TICK_MS / 1000).toFixed(1))
        emit.current(encodeSignal(normalizeSignal(resample(envelope))))
        if (envelope.length * TICK_MS >= MAX_SECONDS * 1000) stop()
      }, TICK_MS)

      rig.current = { stream, ctx, analyser, buffer, timer }
      setSeconds(0)
      setRecording(true)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      setError(
        name === 'NotAllowedError' ? 'Microphone permission denied'
        : name === 'NotFoundError' ? 'No microphone found'
        : 'Could not open the microphone',
      )
      setRecording(false)
    }
  }, [stop])

  // Never leave a live microphone behind.
  useEffect(() => teardown, [teardown])

  return { recording, level, seconds, error, start, stop, maxSeconds: MAX_SECONDS }
}
