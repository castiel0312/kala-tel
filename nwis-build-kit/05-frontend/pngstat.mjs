/**
 * Tiny PNG pixel analyser (no dependencies).
 *
 * Playwright screenshots of a WebGL canvas cannot be re-read with `drawImage` inside the page,
 * because the drawing buffer is cleared once the frame is composited. This decodes the captured
 * PNG instead, so "is anything actually drawn, and of which colour" becomes a measurable claim
 * rather than a guess about a file's size.
 *
 *   node pngstat.mjs shot.png [x y w h]
 */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let pos = 8
  let width = 0
  let height = 0
  let depth = 0
  let colour = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const body = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      depth = body[8]
      colour = body[9]
      if (body[12] !== 0) throw new Error('interlaced PNG not supported')
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + len
  }
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`)
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour]
  if (!channels) throw new Error(`unsupported colour type ${colour}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = Buffer.alloc(stride)
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 0xff
    }
    cur.copy(out, y * stride)
    prev = cur
  }
  return { width, height, channels, data: out }
}

const file = process.argv[2]
if (!file) {
  console.error('usage: node pngstat.mjs <file.png> [x y w h]')
  process.exit(1)
}
const img = decodePng(readFileSync(file))
const [rx, ry, rw, rh] = process.argv.slice(3).map(Number)
const x0 = Number.isFinite(rx) ? rx : 0
const y0 = Number.isFinite(ry) ? ry : 0
const w = Number.isFinite(rw) ? rw : img.width - x0
const h = Number.isFinite(rh) ? rh : img.height - y0

const buckets = new Map()
const seen = new Set()
let opaque = 0
for (let y = y0; y < y0 + h; y += 1) {
  for (let x = x0; x < x0 + w; x += 1) {
    const i = (y * img.width + x) * img.channels
    const r = img.data[i]
    const g = img.data[i + 1]
    const b = img.data[i + 2]
    const a = img.channels === 4 ? img.data[i + 3] : 255
    if (a < 8) continue
    opaque += 1
    seen.add((r >> 4) * 256 + (g >> 4) * 16 + (b >> 4))
    const key =
      r < 70 && g < 70 && b < 70 ? 'ink'
        : r > 185 && g > 140 && b < 115 ? 'yellow'
          : r > 140 && g < 85 && b < 85 ? 'red'
            : b > r && b > g ? 'blue'
              : r > 235 && g > 235 && b > 230 ? 'paper'
                : 'other'
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
}
const total = opaque || 1
const pct = (k) => `${((buckets.get(k) ?? 0) / total * 100).toFixed(2)}%`
console.log(
  JSON.stringify(
    {
      file,
      size: `${img.width}x${img.height}`,
      region: `${w}x${h}+${x0}+${y0}`,
      opaquePx: opaque,
      distinctColours: seen.size,
      ink: pct('ink'),
      yellow: pct('yellow'),
      red: pct('red'),
      blue: pct('blue'),
      paper: pct('paper'),
      other: pct('other'),
    },
    null,
    2,
  ),
)
