import assert from 'node:assert/strict'
import test from 'node:test'
import { renderImage } from '../runtime/render.mjs'

test('renders a reproducible SVG with normalized dimensions', () => {
  const image = renderImage({
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

test('renders PNG bytes and rejects image surfaces without source pixels', () => {
  const image = renderImage({ format: 'png', width: 512, params: { aspect: 1, seed: 7 } })
  assert.equal(image.mimeType, 'image/png')
  assert.deepEqual([...image.body.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.throws(
    () => renderImage({ params: { surface: 'image' } }),
    /requires browser-local source pixels/,
  )
})
