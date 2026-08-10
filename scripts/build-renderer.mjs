import { mkdir } from 'node:fs/promises'
import { build } from 'esbuild'

await mkdir('runtime', { recursive: true })
await build({
  entryPoints: ['src/server/render.ts'],
  outfile: 'runtime/render.mjs',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  // Keep the native resvg package in node_modules; everything authored in this
  // repository is bundled so the production server does not need TypeScript.
  external: ['@resvg/resvg-js', 'sharp'],
})
