import { seeded, between, round } from './rng'
import { smoothClosed, smoothOpen } from './curve'

/**
 * The passcode screen: white line-drawn shells, packed close over rose pink.
 *
 * Drawn rather than photographed, so it is a couple of kilobytes, stays crisp on
 * any screen, and shares its palette with the rest of the card.
 */

const W = 1200
const H = 2000

type R = () => number

const pt = (a: number, rad: number): [number, number] => [Math.cos(a) * rad, Math.sin(a) * rad]
const f = (v: number) => round(v, 1)

/** A ribbed fan — the scallops that carry the pattern. */
function scallop(r: R, size: number): string {
  const ribs = Math.round(between(r, 13, 19))
  const spread = between(r, 1.15, 1.48)
  const step = (spread * 2) / ribs
  const a0 = -Math.PI / 2 - spread
  const chord = 2 * size * Math.sin(step / 2)
  const bulge = chord * 0.78

  const p = (a: number, rad = size) => {
    const [x, y] = pt(a, rad)
    return `${f(x)} ${f(y)}`
  }

  // scalloped outer edge
  let edge = `M ${p(a0)}`
  for (let i = 0; i < ribs; i++) edge += ` A ${f(bulge)} ${f(bulge)} 0 0 1 ${p(a0 + (i + 1) * step)}`
  edge += ` Q ${f(size * 0.1)} ${f(size * 0.22)} 0 0 Z`

  // ribs fanning out of the hinge
  let inner = ''
  for (let i = 1; i < ribs; i++) {
    const a = a0 + i * step
    const [ex, ey] = pt(a, size * 0.95)
    const [mx, my] = pt(a + step * 0.1, size * 0.48)
    inner += `<path d="M 0 0 Q ${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}"/>`
  }

  // growth rings crossing them
  for (const k of [0.42, 0.66, 0.86]) {
    inner += `<path d="M ${p(a0 + step * 0.5, size * k)} A ${f(size * k)} ${f(size * k)} 0 0 1 ${p(a0 + spread * 2 - step * 0.5, size * k)}" opacity="0.55"/>`
  }
  return `<path d="${edge}"/>${inner}`
}

/** A five-armed starfish with its dimpled skin. */
function starfish(r: R, size: number): string {
  const inner = size * between(r, 0.38, 0.48)
  const twist = r() * Math.PI
  const pts: Array<[number, number]> = []
  for (let i = 0; i < 10; i++) {
    const a = twist - Math.PI / 2 + (i * Math.PI) / 5
    pts.push(pt(a, i % 2 === 0 ? size : inner))
  }
  let dots = ''
  for (let i = 0; i < 5; i++) {
    const a = twist - Math.PI / 2 + (i * 2 * Math.PI) / 5
    for (let k = 1; k <= 5; k++) {
      const rad = size * (0.2 + k * 0.14)
      const [x, y] = pt(a + between(r, -0.08, 0.08), rad)
      dots += `<circle cx="${f(x)}" cy="${f(y)}" r="${round(size * (0.05 - k * 0.005), 2)}"/>`
    }
  }
  return (
    `<path d="${smoothClosed(pts, 0.9)}"/>` +
    `<path d="${smoothClosed(pts.map(([x, y]) => [x * 0.76, y * 0.76] as [number, number]), 0.9)}" opacity="0.45"/>` +
    dots
  )
}

/** A whelk: a tapering body of stacked whorls, cross-hatched along its length. */
function conch(r: R, size: number): string {
  const n = Math.round(between(r, 6, 8))
  const fat = size * between(r, 0.72, 0.92)
  const top: Array<[number, number]> = []
  const bot: Array<[number, number]> = []
  for (let i = 0; i <= n * 3; i++) {
    const t = i / (n * 3)
    const x = -size + t * size * 2.05
    const swell = Math.pow(1 - t, 0.8) * Math.min(1, (t + 0.04) / 0.16)
    const halfH = fat * swell
    top.push([x, -halfH])
    bot.push([x, halfH])
  }
  const body = `${smoothOpen(top, 1)} ${smoothOpen([...bot].reverse(), 1).replace(/^M/, 'L')} Z`

  let whorls = ''
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = -size + t * size * 2.05
    const swell = Math.pow(1 - t, 0.8)
    const hh = fat * swell
    whorls += `<path d="M ${f(x)} ${f(-hh)} Q ${f(x - hh * 0.42)} 0 ${f(x)} ${f(hh)}" opacity="0.8"/>`
  }
  // fine ribs running the length
  let ribs = ''
  for (const k of [-0.62, -0.28, 0.06, 0.4, 0.72]) {
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= n * 3; i += 2) {
      const t = i / (n * 3)
      const x = -size + t * size * 2.05
      const swell = Math.pow(1 - t, 0.8) * Math.min(1, (t + 0.04) / 0.16)
      pts.push([x, fat * swell * k])
    }
    ribs += `<path d="${smoothOpen(pts, 1)}" opacity="0.5"/>`
  }
  // the aperture at the fat end
  const lip =
    `<path d="M ${f(-size * 0.9)} ${f(-fat * 0.66)} Q ${f(-size * 1.22)} 0 ${f(-size * 0.9)} ${f(fat * 0.66)}" opacity="0.95"/>` +
    `<path d="M ${f(-size * 0.78)} ${f(-fat * 0.52)} Q ${f(-size * 1.04)} 0 ${f(-size * 0.78)} ${f(fat * 0.52)}" opacity="0.6"/>`
  return `<path d="${body}"/>${whorls}${ribs}${lip}`
}

/** A flat spiral — nautilus, or a little sea snail. */
function spiralShell(r: R, size: number): string {
  const turns = between(r, 2.4, 3.2)
  const decay = between(r, 0.22, 0.32)
  const tilt = r() * Math.PI * 2
  const steps = 80
  const outer: Array<[number, number]> = []
  const inner: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2
    const rad = size * Math.exp(-decay * t)
    outer.push(pt(t + tilt, rad))
    inner.push(pt(t + tilt, rad * 0.5))
  }
  let ribs = ''
  for (let i = 3; i < steps; i += 4) {
    const t = (i / steps) * turns * Math.PI * 2
    const rad = size * Math.exp(-decay * t)
    const [x1, y1] = pt(t + tilt, rad)
    const [x2, y2] = pt(t + tilt, rad * 0.52)
    ribs += `<path d="M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)}" opacity="0.55"/>`
  }
  return `<path d="${smoothOpen(outer, 1)}"/><path d="${smoothOpen(inner, 1)}" opacity="0.5"/>${ribs}`
}

/** A tall auger, banded along its length. */
function auger(r: R, size: number): string {
  const bands = Math.round(between(r, 10, 14))
  const width = size * between(r, 0.24, 0.32)
  const bend = between(r, -0.1, 0.1)
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  for (let i = 0; i <= bands; i++) {
    const t = i / bands
    const y = -size + t * size * 2
    const w = width * Math.pow(t, 0.72)
    const drift = bend * size * t * t
    left.push([-w + drift, y])
    right.push([w + drift, y])
  }
  let rungs = ''
  for (let i = 1; i < bands; i++) {
    const l = left[i]
    const rr = right[i]
    if (!l || !rr) continue
    rungs += `<path d="M ${f(l[0])} ${f(l[1])} Q ${f((l[0] + rr[0]) / 2)} ${f(l[1] + size * 0.075)} ${f(rr[0])} ${f(rr[1] - size * 0.03)}" opacity="0.8"/>`
  }
  const body = `${smoothOpen(left, 1)} ${smoothOpen([...right].reverse(), 1).replace(/^M/, 'L')} Z`
  return `<path d="${body}"/>${rungs}`
}

/** A ribbed cockle. */
function cockle(r: R, size: number): string {
  const ribs = Math.round(between(r, 9, 13))
  const pts: Array<[number, number]> = []
  const n = 26
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const squash = 1 - 0.3 * Math.pow(Math.sin(a), 2)
    pts.push(pt(a, size * squash * between(r, 0.97, 1.03)))
  }
  let inner = ''
  for (let i = 0; i <= ribs; i++) {
    const a = Math.PI * (0.08 + (i / ribs) * 0.84)
    const [ex, ey] = pt(a, size * 0.94)
    inner += `<path d="M 0 ${f(-size * 0.66)} Q ${f(ex * 0.46)} ${f(ey * 0.3)} ${f(ex)} ${f(ey)}" opacity="0.75"/>`
  }
  inner += `<path d="M ${f(-size * 0.6)} ${f(size * 0.3)} A ${f(size * 0.7)} ${f(size * 0.7)} 0 0 0 ${f(size * 0.6)} ${f(size * 0.3)}" opacity="0.5"/>`
  return `<path d="${smoothClosed(pts, 1)}"/>${inner}`
}

const MOTIFS = [scallop, scallop, scallop, starfish, conch, spiralShell, auger, cockle, scallop, conch] as const

export function paintShells(): string {
  const r = seeded(0x5ea5)
  const cols = 4
  const rows = 9
  let out = ''

  // Two offset passes over a jittered grid: dense and interleaved, the way a
  // drawn repeat is, rather than evenly spaced like a stamp.
  for (const pass of [0, 1]) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (pass === 1 && (row + col) % 2 === 0) continue
        const jx = between(r, -0.3, 0.3)
        const jy = between(r, -0.28, 0.28)
        const x = ((col + 0.5 + jx + pass * 0.5) / cols) * W
        const y = ((row + 0.5 + jy + pass * 0.5) / rows) * H
        const size = between(r, 58, 124) * (pass === 1 ? 0.78 : 1)
        const motif = MOTIFS[Math.floor(r() * MOTIFS.length)] ?? scallop
        out +=
          `<g transform="translate(${f(x)},${f(y)}) rotate(${f(between(r, -180, 180))})" ` +
          `opacity="${round(between(r, 0.68, 1), 2)}">${motif(r, size)}</g>`
      }
    }
  }

  return (
    `<svg class="shells" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">` +
    `<g fill="none" stroke="#fffafa" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${out}</g>` +
    `</svg>`
  )
}
