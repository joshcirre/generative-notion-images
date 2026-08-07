// Static file server for the built app.
//
// Laravel Cloud boots Node apps with `npm start` and expects something
// listening on $PORT. This project is a Vite SPA with no server of its own, so
// all this does is serve `dist/`.
//
// Deliberately dependency-free: hosts commonly prune devDependencies before
// boot, which would take Vite — and therefore `vite preview` — with it.

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const ROOT = resolve(process.env.STATIC_ROOT ?? 'dist')
const PORT = Number(process.env.PORT ?? 8080)
const HOST = process.env.HOST ?? '0.0.0.0'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

const INDEX = join(ROOT, 'index.html')
if (!existsSync(INDEX)) {
  console.error(`No build found at ${ROOT}. Run \`npm run build\` before starting.`)
  process.exit(1)
}

/** Resolve a URL path to a file inside ROOT, or null if it escapes or is missing. */
function resolveFile(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0])
  } catch {
    return null // malformed percent-encoding
  }
  const full = resolve(join(ROOT, decoded))
  // Containment check: a crafted path must not read outside the build.
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null
  if (!existsSync(full)) return null
  const stat = statSync(full)
  if (stat.isDirectory()) return resolveFile(join(decoded, 'index.html'))
  return { path: full, size: stat.size }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end()
    return
  }

  // Unknown paths fall back to the SPA shell rather than 404ing.
  const file = resolveFile(req.url ?? '/') ?? { path: INDEX, size: statSync(INDEX).size }
  const ext = extname(file.path).toLowerCase()

  res.writeHead(200, {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'content-length': file.size,
    // Vite fingerprints everything under /assets/, so those can be cached
    // forever; the shell must always be revalidated.
    'cache-control': file.path.includes(`${sep}assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'x-content-type-options': 'nosniff',
  })

  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file.path).on('error', () => res.destroy()).pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} on http://${HOST}:${PORT}`)
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
