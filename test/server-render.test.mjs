import assert from 'node:assert/strict'
import test from 'node:test'
import { renderImage } from '../runtime/render.mjs'

test('renders a reproducible SVG with normalized dimensions', async () => {
  const image = await renderImage({
    format: 'svg',
    width: 1500,
    params: {
      surface: 'letters', text: 'AGENT', baseline: 'flat', seed: 42,
      backgroundLayer: 'both', backgroundPatternMode: 'islands', backgroundPatternSeed: 91,
    },
  })

  const svg = new TextDecoder().decode(image.body)
  assert.equal(image.mimeType, 'image/svg+xml')
  assert.equal(image.width, 1500)
  assert.equal(image.height, 600)
  assert.match(svg, /<svg width="1500" height="600"/)
  assert.match(svg, /id="grid-mask"/)
  assert.doesNotMatch(svg, /<text/)
  assert.equal(image.params.backgroundLayer, 'both')
})

test('renders PNG bytes and rejects image surfaces without source pixels', async () => {
  const image = await renderImage({ format: 'png', width: 512, params: { aspect: 1, seed: 7 } })
  assert.equal(image.mimeType, 'image/png')
  assert.deepEqual([...image.body.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  await assert.rejects(
    () => renderImage({ params: { surface: 'image' } }),
    /image_data is required/,
  )
})

test('converts uploaded image bytes into an isometric mosaic', async () => {
  // A tiny opaque PNG is sufficient to exercise decoding and the image plotter.
  const image = await renderImage({
    format: 'svg',
    width: 512,
    imageData: 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGElEQVQImWNgYGD4DwIMAQEB/0+cOPEfAE9oCkJxI1dwAAAAAElFTkSuQmCC',
    params: {
      surface: 'image', aspect: 1, imageChannel: 'dark', imageThreshold: 0,
      imageResolution: 8, palette: 'dither',
    },
  })

  const svg = new TextDecoder().decode(image.body)
  assert.equal(image.mimeType, 'image/svg+xml')
  assert.equal(image.params.surface, 'image')
  assert.match(svg, /<polygon/)
})
