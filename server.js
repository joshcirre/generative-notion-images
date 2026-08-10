// Web server for Laravel Cloud.
//
// Cloud boots the app with `npm start` and puts nginx in front of it, so this
// process is the web server and must stay listening on $PORT. The app itself is
// a static Vite bundle, so all this does is serve the build.
//
// Dependency-free on purpose: devDependencies are pruned before boot, which
// would take Vite — and therefore `vite preview` — with it.

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { extname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(process.env.STATIC_ROOT ?? 'public')
const PORT = Number(process.env.PORT ?? 8080)
// Deliberately unset by default. Binding '0.0.0.0' listens on IPv4 only, so a
// health probe to localhost:$PORT that resolves to ::1 gets connection-refused
// — the app looks healthy in its own logs and is killed anyway. Omitting the
// host makes Node bind :: dual-stack, which answers on both.
const HOST = process.env.HOST || undefined
const INDEX = join(ROOT, 'index.html')
const RENDER_MODULE = resolve(process.env.RENDER_MODULE ?? 'runtime/render.mjs')
const MAX_BODY = 128 * 1024
let renderer

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

function sendJson(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    'cache-control': 'no-store',
  }).end(json)
}

function hasRenderAccess(req) {
  const expected = process.env.RENDER_API_TOKEN
  // Local development works without ceremony. Production refuses to expose a
  // rendering primitive until an explicit shared secret is configured.
  if (!expected) return process.env.NODE_ENV !== 'production'
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  const a = Buffer.from(supplied), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new Error('request body exceeds 128 KB')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function handleRender(req, res) {
  if (!hasRenderAccess(req)) {
    sendJson(res, process.env.RENDER_API_TOKEN ? 401 : 503, {
      error: process.env.RENDER_API_TOKEN ? 'Invalid render token.' : 'RENDER_API_TOKEN is required in production.',
    })
    return
  }
  try {
    renderer ??= import(pathToFileURL(RENDER_MODULE).href)
    const { renderImage } = await renderer
    const output = renderImage(await readJson(req))
    res.writeHead(200, {
      'content-type': output.mimeType,
      'content-length': output.body.byteLength,
      'cache-control': 'no-store',
      'x-render-width': String(output.width),
      'x-render-height': String(output.height),
      'x-render-format': output.format,
      'x-content-type-options': 'nosniff',
    }).end(output.body)
  } catch (error) {
    sendJson(res, 422, { error: error instanceof Error ? error.message : 'Unable to render image.' })
  }
}

const server = createServer(async (req, res) => {
  const pathname = (req.url ?? '/').split('?')[0]
  if (pathname === '/api/render') {
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST' }).end()
      return
    }
    await handleRender(req, res)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end()
    return
  }

  // A missing build must not take the process down with it. Exiting here would
  // crash-loop behind the proxy and report as "app crashing" with no clue why;
  // answering 503 keeps the server up and puts the reason somewhere visible.
  if (!existsSync(INDEX)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
      .end(`No build at ${ROOT}. The build command must run \`npm run build\`.\n`)
    return
  }

  // Cheap liveness endpoint, matching Laravel's convention, so probes don't
  // read the shell off disk on every check.
  if (pathname === '/up' || pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      .end('ok\n')
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

server.on('error', err => {
  console.error(`Server error: ${err.message}`)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  const addr = server.address()
  console.log(`Serving ${ROOT} on ${typeof addr === 'object' && addr ? `${addr.address}:${addr.port} (${addr.family})` : PORT}`)
  if (!existsSync(INDEX)) console.error(`Warning: no build at ${ROOT}; serving 503 until one exists.`)
})

// Shut down on the platform's signal, but never hang: if connections refuse to
// drain, exit anyway rather than be killed as unresponsive.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  })
}

// SIGTERM and SIGINT are the only signals that legitimately mean "stop". Node
// terminates on SIGHUP and SIGUSR2 by default, which behind a proxy is a silent
// way to die seconds after a healthy boot — and there is no config to reload
// here anyway.
for (const signal of ['SIGHUP', 'SIGUSR2']) {
  process.on(signal, () => console.log(`${signal} ignored; nothing to reload.`))
}

// Likewise, a single bad request should not take down the web server.
process.on('uncaughtException', err => console.error(`Uncaught: ${err.stack ?? err}`))
process.on('unhandledRejection', err => console.error(`Unhandled rejection: ${err}`))
