import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { buildScene, normalize, type ImageSample, type Params } from '../scene'

export const MIN_RENDER_WIDTH = 128
export const MAX_RENDER_WIDTH = 4096

export type RenderRequest = {
  format?: 'svg' | 'png'
  width?: number
  params?: Partial<Params>
  /** Quantize PNG output for small inline MCP previews. */
  compact?: boolean
  /** Raw base64 or a data:image URL. Kept outside Params so URLs stay small. */
  imageData?: string
}

export type RenderedImage = {
  body: Uint8Array
  mimeType: 'image/svg+xml' | 'image/png'
  format: 'svg' | 'png'
  width: number
  height: number
  params: Params
}

export async function renderImage(request: RenderRequest = {}): Promise<RenderedImage> {
  const params = normalize(request.params ?? {})
  const image = params.surface === 'image'
    ? await decodeImage(request.imageData, params.imageResolution)
    : null
  const scene = buildScene(params, image)

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

  const renderedPng = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: scene.params.backdrop === 'none' ? undefined : scene.params.bg1,
  }).render().asPng()
  const png = request.compact
    ? await sharp(renderedPng).png({ compressionLevel: 9, palette: true, quality: 100, effort: 3 }).toBuffer()
    : renderedPng

  return {
    body: png,
    mimeType: 'image/png',
    format,
    width,
    height,
    params: scene.params,
  }
}

const MAX_SOURCE_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_PIXELS = 16_000_000

async function decodeImage(source: string | undefined, resolution: number): Promise<ImageSample> {
  if (!source) throw new Error('image_data is required for the image surface')

  const comma = source.indexOf(',')
  const encoded = source.startsWith('data:') ? source.slice(comma + 1) : source
  if (source.startsWith('data:') && (comma < 0 || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(source))) {
    throw new Error('image_data must be raw base64 or a base64 data:image URL')
  }
  if (!/^[A-Za-z0-9+/\s]*={0,2}$/.test(encoded)) {
    throw new Error('image_data is not valid base64')
  }

  const bytes = Buffer.from(encoded, 'base64')
  if (!bytes.byteLength) throw new Error('image_data is empty')
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('image_data exceeds the 2 MB decoded limit')

  try {
    const pipeline = sharp(bytes, {
      failOn: 'error',
      limitInputPixels: MAX_SOURCE_PIXELS,
    }).rotate()
    const metadata = await pipeline.metadata()
    if (!metadata.width || !metadata.height) throw new Error('Image dimensions are unavailable')

    const scale = Math.min(1, resolution / Math.max(metadata.width, metadata.height))
    const width = Math.max(1, Math.round(metadata.width * scale))
    const height = Math.max(1, Math.round(metadata.height * scale))
    const { data, info } = await pipeline
      .resize(width, height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    return {
      width: info.width,
      height: info.height,
      rgba: new Uint8ClampedArray(data),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unsupported image data'
    throw new Error(`Unable to decode image_data: ${message}`)
  }
}
