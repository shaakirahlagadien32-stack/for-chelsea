import { seeded, between, round } from './rng'
import { EGG } from './world'

/**
 * The egg, and what is inside it.
 *
 * The shell is modelled as two pieces from the very start — a cap and a bowl
 * sharing one ragged seam — so it reads as perfectly whole until the moment the
 * cap lifts away. Cracks are drawn on top with `pathLength="1"`, which lets CSS
 * draw them in with a dash offset without anyone having to measure a path.
 *
 * The hatchling sits *behind* the bowl in paint order, so it rises out of the
 * shell rather than in front of it.
 */

const SEAM = 'L -34 -24 L -23 -10 L -12 -26 L -1 -8 L 10 -24 L 21 -9 L 32 -24 L 46 -13'

const CAP = `M -46 -13 ${SEAM} C 46 -40 26 -72 0 -72 C -26 -72 -46 -40 -46 -13 Z`
const BOWL = `M -46 -13 ${SEAM} C 46 38 26 60 0 60 C -26 60 -46 38 -46 -13 Z`

const CRACKS = [
  'M 2 -31 L -4 -18 L 5 -6',
  'M 5 -6 L -6 6 L 3 19',
  'M -4 -18 L -19 -14 L -28 -3',
  'M 3 19 L 15 23 L 24 16',
  'M 2 -31 L 9 -43 L 3 -52',
  'M -19 -14 L -24 -26 L -17 -36',
]

function rays(): string {
  let out = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 360
    const long = i % 2 === 0
    const tip = long ? -92 : -74
    out +=
      `<path class="egg__ray" transform="rotate(${a})" ` +
      `d="M 0 -28 C 6 -44 5 -${long ? 62 : 52} 0 ${tip} C -5 -${long ? 62 : 52} -6 -44 0 -28 Z"/>`
  }
  return out
}

function speckles(): string {
  const r = seeded(0x5e3d)
  let out = ''
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2
    const rad = Math.sqrt(r())
    const x = Math.cos(a) * rad * 40
    const y = -8 + Math.sin(a) * rad * 56
    out += `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(between(r, 0.9, 2.4), 2)}" ry="${round(between(r, 0.7, 1.8), 2)}" opacity="${round(between(r, 0.18, 0.46), 2)}"/>`
  }
  return out
}

function sparks(): string {
  const r = seeded(0x9a11)
  let out = ''
  for (let i = 0; i < 14; i++) {
    const a = between(r, -Math.PI, 0)
    const d = between(r, 58, 116)
    const x = Math.cos(a) * d
    const y = -42 + Math.sin(a) * d * 0.72
    out +=
      `<circle class="egg__spark" cx="${round(x)}" cy="${round(y)}" r="${round(between(r, 1.1, 2.6), 2)}" ` +
      `style="--spark-delay:${round(between(r, 0, 2.4), 2)}s"/>`
  }
  return out
}

/** A few blades and two small roses tucked in front of the base, so the egg is
 *  sitting *in* the meadow rather than resting on top of it. */
function nest(): string {
  const r = seeded(0x11ee)
  let blades = ''
  for (let i = 0; i < 34; i++) {
    const x = between(r, -66, 74)
    const y = 56 + between(r, -7, 10)
    const l = between(r, 12, 34) * (0.34 + Math.min(1, Math.abs(x) / 46))
    const lean = between(r, -12, 12)
    blades +=
      `<path d="M ${round(x)} ${round(y)} Q ${round(x + lean * 0.4)} ${round(y - l * 0.6)} ${round(x + lean)} ${round(y - l)}" ` +
      `stroke="${r() > 0.5 ? '#3f5232' : '#54693c'}" stroke-width="${round(between(r, 1.4, 2.8), 2)}" ` +
      `stroke-linecap="round" fill="none" opacity="${round(between(r, 0.55, 0.9), 2)}"/>`
  }
  const bloom = (x: number, y: number, rad: number, tone: string) =>
    `<g transform="translate(${x},${y})"><circle r="${rad}" fill="${tone}"/>` +
    `<path d="M ${round(-rad * 0.52)} 0 A ${round(rad * 0.52)} ${round(rad * 0.52)} 0 1 1 ${round(rad * 0.2)} ${round(rad * 0.46)}" ` +
    `fill="none" stroke="#cf5f7d" stroke-width="${round(rad * 0.2, 2)}" stroke-linecap="round" opacity="0.45"/>` +
    `<circle r="${round(rad * 0.17, 2)}" fill="#fdeaec" opacity="0.75"/></g>`
  return blades + bloom(-52, 52, 13, '#eb8fa4') + bloom(56, 58, 11, '#f5bcc6')
}

function shards(): string {
  return (
    `<path class="egg__shard egg__shard--a" d="M -46 -13 L -34 -24 L -26 -12 Z"/>` +
    `<path class="egg__shard egg__shard--b" d="M 21 -9 L 32 -24 L 40 -12 Z"/>` +
    `<path class="egg__shard egg__shard--c" d="M -12 -26 L -1 -8 L -8 -6 Z"/>`
  )
}

export function paintEgg(prefix: string): string {
  const p = (n: string) => `${prefix}-${n}`

  const defs =
    `<defs>` +
    `<linearGradient id="${p('shell')}" gradientUnits="userSpaceOnUse" x1="-40" y1="-70" x2="40" y2="58">` +
    `<stop offset="0" stop-color="#fffdf6"/><stop offset="0.42" stop-color="#f6ecd8"/>` +
    `<stop offset="1" stop-color="#e2cfae"/></linearGradient>` +
    `<linearGradient id="${p('shellIn')}" x1="0" y1="0" x2="0.3" y2="1">` +
    `<stop offset="0" stop-color="#c2a888"/><stop offset="1" stop-color="#e6d6ba"/></linearGradient>` +
    `<linearGradient id="${p('shade')}" gradientUnits="userSpaceOnUse" x1="34" y1="-62" x2="-40" y2="52">` +
    `<stop offset="0" stop-color="#fffdf4" stop-opacity="0.75"/>` +
    `<stop offset="0.28" stop-color="#f4e6c8" stop-opacity="0"/>` +
    `<stop offset="0.6" stop-color="#b08c60" stop-opacity="0.3"/>` +
    `<stop offset="0.85" stop-color="#8a683f" stop-opacity="0.5"/>` +
    `<stop offset="1" stop-color="#6b4e2c" stop-opacity="0.66"/></linearGradient>` +

    `<radialGradient id="${p('sunBody')}" cx="0.38" cy="0.32" r="0.78">` +
    `<stop offset="0" stop-color="#fff6d8"/><stop offset="0.5" stop-color="#fbd98a"/>` +
    `<stop offset="1" stop-color="#f0b85f"/></radialGradient>` +
    `<radialGradient id="${p('bloom')}" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="#fff8e0" stop-opacity="0.95"/>` +
    `<stop offset="0.3" stop-color="#ffeab6" stop-opacity="0.6"/>` +
    `<stop offset="0.62" stop-color="#ffdf9c" stop-opacity="0.26"/>` +
    `<stop offset="1" stop-color="#ffd88c" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="${p('clipBowl')}"><path d="${BOWL}"/></clipPath>` +
    `<clipPath id="${p('clipCap')}"><path d="${CAP}"/></clipPath>` +
    `<filter id="${p('eggSoft')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>` +
    `</defs>`

  const hatchling =
    `<g class="egg__sun">` +
    `<g class="egg__bob">` +
    `<g transform="translate(0,-42)"><g class="egg__rays">${rays()}</g></g>` +
    `<g class="egg__body" transform="translate(0,-42)">` +
    `<circle r="26" fill="url(#${p('sunBody')})"/>` +
    `<circle r="26" fill="none" stroke="#fff3cf" stroke-width="1" opacity="0.5"/>` +
    `<ellipse class="egg__blush" cx="-16.5" cy="4" rx="6" ry="3.4"/>` +
    `<ellipse class="egg__blush" cx="16.5" cy="4" rx="6" ry="3.4"/>` +
    `<g class="egg__face">` +
    `<path d="M -14 -3 q 5 -6.5 10 0"/>` +
    `<path d="M 4 -3 q 5 -6.5 10 0"/>` +
    `<path d="M -6.5 6 q 6.5 6 13 0"/>` +
    `</g>` +
    `<path class="egg__hat" d="M -15 -20 a 15 11.5 0 0 1 30 0 z" transform="rotate(-16 0 -20)" ` +
    `fill="url(#${p('shell')})" stroke="#cdb896" stroke-width="0.7"/>` +
    `</g>` +
    `</g>` +
    `</g>`

  return (
    `<g class="egg" id="egg" data-stage="0" transform="translate(${EGG.x},${EGG.y}) scale(1.3)">` +
    defs +
    `<ellipse class="egg__shadow" cx="5" cy="58" rx="52" ry="11" filter="url(#${p('eggSoft')})"/>` +
    `<circle class="egg__bloom" cy="-44" r="168" fill="url(#${p('bloom')})"/>` +
    hatchling +
    `<g class="egg__shell">` +
    `<g class="egg__bowl-group">` +
    `<path class="egg__bowl" d="${BOWL}" fill="url(#${p('shell')})" stroke="url(#${p('shell')})" stroke-width="0.8"/>` +
    `<path class="egg__shade" d="${BOWL}" fill="url(#${p('shade')})"/>` +
    `<g class="egg__specks" fill="#a07f52" clip-path="url(#${p('clipBowl')})">${speckles()}</g>` +
    `<path class="egg__bowl-lip" d="M -46 -13 ${SEAM}" fill="none" stroke="url(#${p('shellIn')})" stroke-width="3.4" stroke-linejoin="round"/>` +
    `</g>` +
    `<g class="egg__cracks">` +
    CRACKS.map((d, i) => `<path class="egg__crack egg__crack--${i + 1}" d="${d}" pathLength="1"/>`).join('') +
    `</g>` +
    `<ellipse class="egg__cap-shadow" cx="26" cy="62" rx="40" ry="8" filter="url(#${p('eggSoft')})"/>` +
    `<g class="egg__cap-group">` +
    `<path class="egg__cap" d="${CAP}" fill="url(#${p('shell')})" stroke="url(#${p('shell')})" stroke-width="0.9"/>` +
    `<path class="egg__shade" d="${CAP}" fill="url(#${p('shade')})"/>` +
    `<g class="egg__specks" fill="#a07f52" clip-path="url(#${p('clipCap')})">${speckles()}</g>` +
    `</g>` +
    `<g class="egg__shards" fill="url(#${p('shell')})">${shards()}</g>` +
    `</g>` +
    `<g class="egg__sparks">${sparks()}</g>` +
    `<g class="egg__nest">${nest()}</g>` +
    `</g>`
  )
}
