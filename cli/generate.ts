// Batch-generate isometric covers from the command line, using the same engine
// the app runs on.
//
//   npm run generate                                    one SVG, default params
//   npm run generate -- --png --seed 42                 one 1500x600 PNG
//   npm run generate -- --random --count 20 --png       20 different designs
//   npm run generate -- --params "mode=waves&seed=7&grid=8"
//
// --params takes the query string the app shows in its bottom status bar, so
// anything tuned by hand in the browser is reproducible here.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { DEFAULTS, MODES, SHAPES, buildScene, fromQuery, randomize, type Params } from '../src/scene/index'

type Options = {
  count: number
  width: number
  out: string
  png: boolean
  random: boolean
  params: string
  help: boolean
}

const DEFAULT_OPTIONS: Options = {
  count: 1, width: 1500, out: '.', png: false, random: false, params: '', help: false,
}

function die(message: string): never {
  console.error(`generate: ${message}\n`)
  usage()
  process.exit(1)
}

function usage() {
  console.error(`Usage: npm run generate -- [options]

  --count N        how many designs, one per consecutive seed (default 1)
  --width N        output width in px (default 1500); height follows --aspect
  --out PATH       file, or directory when --count > 1 (default .)
  --png            rasterize with headless Chrome instead of writing SVG
  --random         derive every parameter from the seed
  --params "..."   query string copied out of the app
  --help           this message

Any scene parameter may also be passed directly, e.g. --mode waves --grid 12:
  ${Object.keys(DEFAULTS).map(k => '--' + k).join(' ')}

Compositions: ${MODES.join(', ')}
Shapes:       ${SHAPES.join(', ')}`)
}

function parseArgs(argv: string[]) {
  const opts = { ...DEFAULT_OPTIONS }
  const scene: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) die(`unexpected argument: ${arg}`)
    const key = arg.slice(2)
    if (key === 'png' || key === 'random' || key === 'help') {
      opts[key] = true
      continue
    }
    const value = argv[++i]
    if (value === undefined) die(`--${key} needs a value`)
    if (key === 'out' || key === 'params') opts[key] = value
    else if (key === 'count' || key === 'width') opts[key] = Number(value)
    else if (key in DEFAULTS) scene[key] = value
    else die(`unknown option --${key}`)
  }
  return { opts, scene }
}

// Chrome is only needed for --png; SVG output has no external dependencies.
function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[]
  const found = candidates.find(p => fs.existsSync(p))
  if (!found) die('could not find Chrome for --png. Set CHROME_PATH, or drop --png to write SVG.')
  return found
}

function toPNG(chrome: string, svg: string, w: number, h: number, dest: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-'))
  const tmp = path.join(dir, 'frame.svg')
  fs.writeFileSync(tmp, svg.replace('<svg ', `<svg width="${w}" height="${h}" `))
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`, '--virtual-time-budget=10000',
    `--screenshot=${path.resolve(dest)}`, `file://${tmp}`,
  ], { stdio: 'ignore' })
  fs.rmSync(dir, { recursive: true, force: true })
}

function main() {
  const { opts, scene } = parseArgs(process.argv.slice(2))
  if (opts.help) return usage()

  const base = { ...fromQuery(opts.params), ...scene } as Partial<Params>
  const firstSeed = Number(base.seed ?? DEFAULTS.seed)
  const chrome = opts.png ? findChrome() : null
  const ext = opts.png ? 'png' : 'svg'

  // A single output may be named directly; a batch needs a directory.
  const many = opts.count > 1
  const named = !many && opts.out.endsWith(`.${ext}`)
  const dir = named ? path.dirname(opts.out) : opts.out
  fs.mkdirSync(dir, { recursive: true })

  for (let i = 0; i < opts.count; i++) {
    const seed = firstSeed + i
    // --random rolls a whole design from the seed; explicit flags still win.
    const params = { ...(opts.random ? randomize(seed) : {}), ...base, seed }
    const scn = buildScene(params)
    const w = opts.width
    const h = Math.round(w / scn.params.aspect)
    const dest = named ? opts.out : path.join(dir, `${scn.params.mode}-${seed}.${ext}`)

    if (chrome) toPNG(chrome, scn.svg, w, h, dest)
    else fs.writeFileSync(dest, scn.svg.replace('<svg ', `<svg width="${w}" height="${h}" `))

    console.log(
      `${dest}  ${scn.params.mode}/${scn.params.shape}  ${w}×${h}  ${scn.faces} faces`)
  }
}

main()
