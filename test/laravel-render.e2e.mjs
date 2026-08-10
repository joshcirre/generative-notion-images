import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const API = path.join(ROOT, 'api')

async function openPort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  server.close()
  await once(server, 'close')
  return port
}

function processWithLogs(command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let logs = ''
  const collect = chunk => { logs = (logs + chunk).slice(-12_000) }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)
  return { child, logs: () => logs }
}

async function waitFor(url, process, timeout = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (process.exitCode !== null) throw new Error(`Process exited before ${url} was ready.`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The listener may not be bound yet.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for ${url}.`)
}

async function stop(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    once(child, 'exit'),
    new Promise(resolve => setTimeout(resolve, 3_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

test('Laravel authenticates and proxies a real letter-background render', async t => {
  const rendererPort = await openPort()
  const apiPort = await openPort()
  const rendererToken = 'renderer-e2e-secret'
  const agentToken = 'agent-e2e-secret'

  const renderer = processWithLogs(process.execPath, ['server.js'], ROOT, {
    NODE_ENV: 'production',
    PORT: String(rendererPort),
    RENDER_API_TOKEN: rendererToken,
  })
  const laravelRouter = path.join(API, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')
  const api = processWithLogs('php', [
    '-S', `127.0.0.1:${apiPort}`, laravelRouter,
  ], path.join(API, 'public'), {
    APP_ENV: 'testing',
    APP_DEBUG: 'false',
    AGENT_API_TOKEN: agentToken,
    RENDERER_URL: `http://127.0.0.1:${rendererPort}`,
    RENDERER_TOKEN: rendererToken,
  })

  t.after(async () => {
    await Promise.all([stop(api.child), stop(renderer.child)])
  })

  try {
    await Promise.all([
      waitFor(`http://127.0.0.1:${rendererPort}/up`, renderer.child),
      waitFor(`http://127.0.0.1:${apiPort}/up`, api.child),
    ])

    const endpoint = `http://127.0.0.1:${apiPort}/api/renders`
    const unauthorized = await fetch(endpoint, { method: 'POST' })
    assert.equal(unauthorized.status, 401)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${agentToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        format: 'png',
        width: 600,
        text: 'AGENT',
        layout: 'header',
        background: 'both',
        background_mode: 'islands',
        background_seed: 91,
        background_reach: 26,
      }),
    })
    const body = new Uint8Array(await response.arrayBuffer())

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/png')
    assert.equal(response.headers.get('x-render-width'), '600')
    assert.equal(response.headers.get('x-render-height'), '240')
    assert.deepEqual([...body.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  } catch (error) {
    throw new Error(`${error.message}\n\nRenderer:\n${renderer.logs()}\n\nLaravel:\n${api.logs()}`)
  }
})
