import type { ImageSample } from '../scene'

/** Decode and downsample locally. No object URL, upload, or persistent copy. */
export async function sampleImage(file: File, resolution: number): Promise<ImageSample> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, resolution / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('This browser cannot sample images.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return { width, height, rgba: ctx.getImageData(0, 0, width, height).data }
  } finally {
    bitmap.close()
  }
}
