import { Resvg } from '@resvg/resvg-js'
import { buildScene, type Params } from '../scene'

export const MIN_RENDER_WIDTH = 128
export const MAX_RENDER_WIDTH = 4096

export type RenderRequest = {
  format?: 'svg' | 'png'
  width?: number
  params?: Partial<Params>
}

export type RenderedImage = {
  body: Uint8Array
  mimeType: 'image/svg+xml' | 'image/png'
  format: 'svg' | 'png'
  width: number
  height: number
  params: Params
}

export function renderImage(request: RenderRequest = {}): RenderedImage {
  const scene = buildScene(request.params ?? {})
  if (scene.params.surface === 'image') {
    throw new Error('The image surface requires browser-local source pixels and cannot be rendered remotely yet.')
  }

  const requestedWidth = Number(request.width ?? 1500)
  if (!Number.isFinite(requestedWidth)) throw new Error('width must be a number')
  const width = Math.round(Math.min(MAX_RENDER_WIDTH, Math.max(MIN_RENDER_WIDTH, requestedWidth)))
  const height = Math.round(width / scene.params.aspect)
  const format = request.format === 'svg' ? 'svg' : 'png'
  const svg = scene.svg.replace('<svg ', `<svg width="${width}" height="${height}" `)

  if (format === 'svg') {
    return {
      body: new TextEncoder().encode(svg),
      mimeType: 'image/svg+xml',
      format,
      width,
      height,
      params: scene.params,
    }
  }

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: scene.params.backdrop === 'none' ? undefined : scene.params.bg1,
  }).render().asPng()

  return {
    body: png,
    mimeType: 'image/png',
    format,
    width,
    height,
    params: scene.params,
  }
}
