import { seeded, between, round } from './rng'
import { smoothOpen } from './curve'
import { CANVAS, EGG, WORLD } from './world'

/**
 * The valley.
 *
 * A pink impasto landscape: streaked rose sky, blue-grey peaks, dark evergreen
 * slopes folding into a valley, pale fields in the middle distance, and a cream
 * path climbing up through a field of roses.
 *
 * It is painted once in full colour. The monochrome half of the card is the very
 * same markup rendered a second time under a warm-graphite CSS filter, so the two
 * plates line up exactly and the swipe can wipe cleanly between them.
 *
 * Every gradient and filter id is namespaced, because this markup appears twice.
 */

type P = (name: string) => string
type R = () => number

/* ————— the bones of the composition ————— */

const RIDGE_FAR =
  'M -80 1240 L -80 902 C 90 856 190 790 300 822 C 368 842 408 776 482 742 ' +
  'C 558 708 616 792 712 828 C 786 856 844 806 928 768 C 1012 730 1072 798 1168 832 ' +
  'C 1264 866 1344 818 1448 784 C 1542 752 1600 812 1680 840 L 1680 1240 Z'

const RIDGE_MID =
  'M -80 1240 L -80 972 C 70 944 156 900 254 922 C 340 942 404 884 500 868 ' +
  'C 598 852 660 916 756 938 C 852 960 914 902 1020 888 C 1128 874 1200 932 1306 948 ' +
  'C 1412 964 1508 914 1680 944 L 1680 1240 Z'

const RIDGE_NEAR =
  'M -80 1300 L -80 1044 C 120 1000 280 1046 420 1016 C 560 986 660 1030 800 1008 ' +
  'C 940 986 1064 1034 1210 1004 C 1356 974 1540 1026 1680 998 L 1680 1300 Z'

const SLOPE_LEFT =
  'M -80 1560 L -80 792 C 110 820 254 896 392 986 C 520 1070 608 1150 664 1240 ' +
  'C 706 1308 726 1400 734 1560 Z'

const SLOPE_RIGHT =
  'M 1680 1560 L 1680 836 C 1500 858 1352 926 1214 1016 C 1082 1102 996 1184 944 1268 ' +
  'C 906 1330 888 1416 882 1560 Z'

const ROSE_FIELD =
  'M -80 2480 L -80 1352 C 210 1286 470 1338 700 1306 C 900 1278 1060 1330 1270 1300 ' +
  'C 1450 1274 1570 1316 1680 1290 L 1680 2480 Z'

/**
 * The cream path. Generated rather than hand-written, because the rose field
 * needs the same centre-line and width to know where not to grow.
 */
const PATH_TOP = 1248
const PATH_BOTTOM = 2500

const pathCentre = (t: number) =>
  800 + Math.sin(t * 2.55 + 0.5) * 92 + Math.sin(t * 5.4 + 1.2) * 26 - 30 * t
const pathHalf = (t: number) => 11 + Math.pow(t, 1.55) * 158
const pathT = (y: number) => Math.min(1, Math.max(0, (y - PATH_TOP) / (PATH_BOTTOM - PATH_TOP)))

function pathOutline(): string {
  const steps = 26
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = PATH_TOP + t * (PATH_BOTTOM - PATH_TOP)
    const c = pathCentre(t)
    const hw = pathHalf(t)
    left.push([c - hw, y])
    right.push([c + hw, y])
  }
  return `${smoothOpen(left, 1)} ${smoothOpen([...right].reverse(), 1).replace(/^M/, 'L')} Z`
}

/** True where the path is, so nothing is planted on the track. */
function onPath(x: number, y: number, margin = 0): boolean {
  if (y < PATH_TOP - 30) return false
  const t = pathT(y)
  return Math.abs(x - pathCentre(t)) < pathHalf(t) + margin
}

/* ————— brushwork ————— */

/**
 * Nothing grows where the egg is sitting. Blooms below it are left alone, so it
 * still looks nestled down among them rather than standing in a bald patch.
 */
function shadesTheEgg(x: number, y: number, size: number): boolean {
  const dx = (x - EGG.x) / (104 + size)
  const dy = (y - (EGG.y - 24)) / (132 + size)
  return dx * dx + dy * dy < 1
}

/** Long horizontal drags of the palette knife, for the sky and the fields. */
function drags(
  r: R,
  count: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  len: [number, number],
  thick: [number, number],
  tones: readonly string[],
  o: [number, number],
): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = between(r, x0, x1)
    const y = between(r, y0, y1)
    const l = between(r, len[0], len[1])
    const rise = between(r, -l * 0.09, l * 0.09)
    const tone = tones[Math.floor(r() * tones.length)] ?? tones[0]
    out +=
      `<path d="M ${round(x)} ${round(y)} Q ${round(x + l * 0.5)} ${round(y + rise * 1.6)} ${round(x + l)} ${round(y + rise)}" ` +
      `stroke="${tone}" stroke-width="${round(between(r, thick[0], thick[1]), 2)}" stroke-linecap="round" fill="none" ` +
      `opacity="${round(between(r, o[0], o[1]), 2)}"/>`
  }
  return out
}

/** Bands of sky laid down in clusters, the way a knife actually works a canvas. */
function skyBrush(r: R, bands: number, x0: number, x1: number, y0: number, y1: number): string {
  const tones = ['#fbd9d2', '#ef8fa4', '#f6a89e', '#fce6de', '#e8799a', '#f9c0b8', '#fdeae2'] as const
  let out = ''
  for (let b = 0; b < bands; b++) {
    const cy = y0 + ((b + between(r, 0.15, 0.85)) / bands) * (y1 - y0)
    const tone = tones[Math.floor(r() * tones.length)] ?? '#fbd9d2'
    const marks = Math.round(between(r, 4, 9))
    for (let i = 0; i < marks; i++) {
      const x = between(r, x0, x1)
      const y = cy + between(r, -26, 26)
      const l = between(r, 140, 520)
      const rise = between(r, -14, 14)
      out +=
        `<path d="${'M'} ${round(x)} ${round(y)} Q ${round(x + l * 0.5)} ${round(y + rise * 2)} ${round(x + l)} ${round(y + rise)}" ` +
        `stroke="${tone}" stroke-width="${round(between(r, 10, 34), 1)}" stroke-linecap="round" fill="none" ` +
        `opacity="${round(between(r, 0.18, 0.46), 2)}"/>`
    }
  }
  return out
}

/** Short upright marks — stems, grass, the tooth of the field. */
function stems(
  r: R,
  count: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  len: [number, number],
  tones: readonly string[],
  o: [number, number],
  clearEgg = false,
): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = between(r, x0, x1)
    const y = between(r, y0, y1)
    const depth = (y - y0) / Math.max(1, y1 - y0)
    const l = between(r, len[0], len[1]) * (0.45 + depth)
    // Blades in front of the egg are fine; blades drawn across its face are not.
    if (clearEgg && shadesTheEgg(x, y - l * 0.7, 24)) continue
    const lean = between(r, -l * 0.34, l * 0.34)
    const tone = tones[Math.floor(r() * tones.length)] ?? tones[0]
    out +=
      `<path d="M ${round(x)} ${round(y)} Q ${round(x + lean * 0.35)} ${round(y - l * 0.6)} ${round(x + lean)} ${round(y - l)}" ` +
      `stroke="${tone}" stroke-width="${round(between(r, 1.1, 2.6) * (0.5 + depth), 2)}" stroke-linecap="round" fill="none" ` +
      `opacity="${round(between(r, o[0], o[1]), 2)}"/>`
  }
  return out
}

/** A dark evergreen, built from overlapping organic blobs. */
function tree(r: R, x: number, baseY: number, h: number, fill: string, o = 1): string {
  const w = h * between(r, 0.5, 0.66)
  const lean = between(r, -h * 0.05, h * 0.05)
  const crownY = baseY - h * 0.62
  let canopy = ''
  const blobs = Math.round(between(r, 5, 8))
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + r()
    const rad = between(r, 0.14, 0.4)
    const cx = x + lean + Math.cos(a) * w * rad
    const cy = crownY + Math.sin(a) * h * rad * 0.46
    const rx = between(r, w * 0.26, w * 0.44)
    canopy += `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="${round(rx)}" ry="${round(rx * between(r, 0.8, 1.12))}"/>`
  }
  return (
    `<g fill="${fill}" opacity="${round(o, 2)}">` +
    `<path d="M ${round(x)} ${round(baseY)} C ${round(x + lean * 0.3)} ${round(baseY - h * 0.34)} ${round(x + lean * 0.7)} ${round(baseY - h * 0.5)} ${round(x + lean)} ${round(baseY - h * 0.7)}" ` +
    `stroke="${fill}" stroke-width="${round(Math.max(1.4, h * 0.045))}" stroke-linecap="round" fill="none"/>` +
    canopy +
    `</g>`
  )
}

/* ————— the roses ————— */

const PETAL = ['#f0a3b4', '#eb8fa4', '#e87e95', '#f5bcc6', '#e4708c', '#f2ada4', '#f7c9cd'] as const
const PETAL_PALE = ['#f7c4cd', '#fadde2', '#f3aebc', '#efd3d6'] as const

/**
 * A rose, drawn the way one gets painted: a mass of colour, a couple of curled
 * arcs for the furl of the petals, a lighter heart.
 */
function rose(r: R, x: number, y: number, size: number, tier: 0 | 1 | 2): string {
  // The far band mixes pale and deep so the monochrome plate keeps its tonal range.
  const pool = tier === 0 ? (r() > 0.62 ? PETAL_PALE : PETAL) : PETAL
  const base = pool[Math.floor(r() * pool.length)] ?? '#eb8fa4'
  const dark = '#cf5f7d'
  const light = '#fdeaec'

  if (tier === 0) {
    return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(size, 2)}" fill="${base}" opacity="${round(between(r, 0.6, 0.95), 2)}"/>`
  }

  if (tier === 1) {
    const a = between(r, 0, Math.PI * 2)
    const sx = x + Math.cos(a) * size * 0.5
    const sy = y + Math.sin(a) * size * 0.5
    const ex = x + Math.cos(a + 2.5) * size * 0.42
    const ey = y + Math.sin(a + 2.5) * size * 0.42
    return (
      `<circle cx="${round(x)}" cy="${round(y)}" r="${round(size, 2)}" fill="${base}" opacity="${round(between(r, 0.85, 1), 2)}"/>` +
      `<path d="M ${round(sx)} ${round(sy)} A ${round(size * 0.5)} ${round(size * 0.5)} 0 1 1 ${round(ex)} ${round(ey)}" ` +
      `fill="none" stroke="${dark}" stroke-width="${round(size * 0.24, 2)}" stroke-linecap="round" opacity="0.42"/>`
    )
  }

  let petals = ''
  const n = Math.round(between(r, 3, 5))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.9
    petals +=
      `<ellipse cx="${round(Math.cos(a) * size * 0.72)}" cy="${round(Math.sin(a) * size * 0.72)}" ` +
      `rx="${round(size * between(r, 0.44, 0.62), 2)}" ry="${round(size * between(r, 0.34, 0.5), 2)}" fill="${base}"/>`
  }
  return (
    `<g transform="translate(${round(x)},${round(y)}) rotate(${round(between(r, 0, 360))}) scale(1,${round(between(r, 0.84, 1), 3)})" ` +
    `opacity="${round(between(r, 0.88, 1), 2)}">` +
    petals +
    `<circle r="${round(size, 2)}" fill="${base}"/>` +
    `<path d="M ${round(-size * 0.55)} 0 A ${round(size * 0.55)} ${round(size * 0.55)} 0 1 1 ${round(size * 0.22)} ${round(size * 0.48)}" ` +
    `fill="none" stroke="${dark}" stroke-width="${round(size * 0.2, 2)}" stroke-linecap="round" opacity="0.46"/>` +
    `<path d="M ${round(-size * 0.27)} ${round(size * 0.06)} A ${round(size * 0.29)} ${round(size * 0.29)} 0 1 0 ${round(size * 0.17)} ${round(-size * 0.21)}" ` +
    `fill="none" stroke="${light}" stroke-width="${round(size * 0.15, 2)}" stroke-linecap="round" opacity="0.62"/>` +
    `<circle r="${round(size * 0.16, 2)}" fill="${light}" opacity="0.8"/>` +
    `</g>`
  )
}

function roseField(r: R, count: number, y0: number, y1: number, size: [number, number], tier: 0 | 1 | 2): string {
  let out = ''
  let tries = 0
  let made = 0
  while (made < count && tries < count * 4) {
    tries++
    const x = between(r, -60, WORLD.w + 60)
    const y = between(r, y0, y1)
    if (onPath(x, y, tier === 2 ? -size[1] * 0.85 : -size[0] * 0.5)) continue
    const depth = (y - y0) / Math.max(1, y1 - y0)
    const rad = between(r, size[0], size[1]) * (0.72 + depth * 0.5)
    if (shadesTheEgg(x, y, rad)) continue
    out += rose(r, x, y, rad, tier)
    made++
  }
  return out
}

/* ————— the painting ————— */

export function paintLandscape(prefix: string, detail = 1): string {
  const p: P = (n) => `${prefix}-${n}`
  const r = seeded(0x1409)
  const { w } = WORLD
  const n = (base: number) => Math.max(6, Math.round(base * detail))

  const defs =
    `<defs>` +
    `<linearGradient id="${p('sky')}" x1="0" y1="0" x2="0.08" y2="1">` +
    `<stop offset="0" stop-color="#ec86a2"/><stop offset="0.22" stop-color="#f29da9"/>` +
    `<stop offset="0.46" stop-color="#f7b4b2"/><stop offset="0.7" stop-color="#fbcbbe"/>` +
    `<stop offset="0.88" stop-color="#f9d3c4"/><stop offset="1" stop-color="#f3c4ba"/></linearGradient>` +

    `<linearGradient id="${p('far')}" x1="0" y1="0" x2="0.1" y2="1">` +
    `<stop offset="0" stop-color="#b3c2ca"/><stop offset="1" stop-color="#cfd6d4"/></linearGradient>` +
    `<linearGradient id="${p('mid')}" x1="0" y1="0" x2="0.1" y2="1">` +
    `<stop offset="0" stop-color="#728f98"/><stop offset="1" stop-color="#94aaab"/></linearGradient>` +
    `<linearGradient id="${p('near')}" x1="0" y1="0" x2="0.14" y2="1">` +
    `<stop offset="0" stop-color="#4a706e"/><stop offset="1" stop-color="#6d8f87"/></linearGradient>` +

    `<linearGradient id="${p('fields')}" x1="0.1" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#cdd48c"/><stop offset="0.55" stop-color="#c3cd7e"/>` +
    `<stop offset="1" stop-color="#aebb6c"/></linearGradient>` +

    `<linearGradient id="${p('slopeL')}" x1="0" y1="0" x2="0.5" y2="1">` +
    `<stop offset="0" stop-color="#40654b"/><stop offset="0.55" stop-color="#31533b"/>` +
    `<stop offset="1" stop-color="#294634"/></linearGradient>` +
    `<linearGradient id="${p('slopeR')}" x1="1" y1="0" x2="0.5" y2="1">` +
    `<stop offset="0" stop-color="#476e53"/><stop offset="0.55" stop-color="#345740"/>` +
    `<stop offset="1" stop-color="#2c4a37"/></linearGradient>` +

    `<linearGradient id="${p('field')}" x1="0.1" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#6b7350"/><stop offset="0.4" stop-color="#5c6644"/>` +
    `<stop offset="1" stop-color="#333d22"/></linearGradient>` +

    `<linearGradient id="${p('path')}" x1="0.2" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#eadcc2"/><stop offset="0.45" stop-color="#e2cdb2"/>` +
    `<stop offset="1" stop-color="#d3bb9e"/></linearGradient>` +

    `<linearGradient id="${p('bloomWash')}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#c07f96" stop-opacity="0.14"/>` +
    `<stop offset="0.45" stop-color="#b9738d" stop-opacity="0.18"/>` +
    `<stop offset="1" stop-color="#96567a" stop-opacity="0.14"/></linearGradient>` +

    `<radialGradient id="${p('warm')}" cx="0.6" cy="0.45" r="0.38">` +
    `<stop offset="0" stop-color="#ffd9cf" stop-opacity="0.46"/>` +
    `<stop offset="0.45" stop-color="#ffc7bd" stop-opacity="0.2"/>` +
    `<stop offset="0.8" stop-color="#ffbdb6" stop-opacity="0.04"/>` +
    `<stop offset="1" stop-color="#ffbdb6" stop-opacity="0"/></radialGradient>` +

    `<linearGradient id="${p('haze')}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fbd2c8" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="#fbd2c8" stop-opacity="0.6"/>` +
    `<stop offset="1" stop-color="#fbd2c8" stop-opacity="0"/></linearGradient>` +

    `<filter id="${p('soft4')}" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>` +
    `<filter id="${p('soft10')}" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>` +
    `<filter id="${p('soft30')}" x="-50%" y="-60%" width="200%" height="220%"><feGaussianBlur stdDeviation="26"/></filter>` +
    `</defs>`

  // ————— sky —————
  const sky =
    `<g class="ls-sky">` +
    `<rect x="-80" y="-80" width="${w + 160}" height="1340" fill="url(#${p('sky')})"/>` +
    `<ellipse cx="1010" cy="380" rx="620" ry="300" fill="#fde0d4" opacity="0.34" filter="url(#${p('soft30')})"/>` +
    skyBrush(r, n(11), -120, w + 40, -60, 980) +
    drags(r, n(46), -120, w + 40, -60, 980, [70, 240], [9, 30],
      ['#fbd9d2', '#ef8fa4', '#f6a89e', '#fce6de', '#e8799a'], [0.2, 0.52]) +
    drags(r, n(26), -120, w + 40, 660, 1010, [220, 620], [11, 32],
      ['#fce4da', '#fad3c6', '#f6b8ae'], [0.24, 0.52]) +
    `</g>`

  // ————— distance —————
  const distance =
    `<g class="ls-distance">` +
    `<path d="${RIDGE_FAR}" fill="url(#${p('far')})" opacity="0.92" filter="url(#${p('soft4')})"/>` +
    `<path d="${RIDGE_FAR}" fill="#e4eaed" opacity="0.28" transform="translate(-18,-10)" filter="url(#${p('soft10')})"/>` +
    `<rect x="-80" y="856" width="${w + 160}" height="210" fill="url(#${p('haze')})" opacity="0.7"/>` +
    `<path d="${RIDGE_MID}" fill="url(#${p('mid')})" opacity="0.95" filter="url(#${p('soft4')})"/>` +
    `<path d="${RIDGE_MID}" fill="#dbe7e6" opacity="0.24" transform="translate(-13,-8)" filter="url(#${p('soft10')})"/>` +
    drags(r, n(30), -80, w + 80, 780, 980, [90, 260], [4, 12], ['#cfdcdd', '#93aab0', '#eae2dd'], [0.1, 0.3]) +
    `<rect x="-80" y="906" width="${w + 160}" height="190" fill="url(#${p('haze')})" opacity="0.55"/>` +
    `<path d="${RIDGE_NEAR}" fill="url(#${p('near')})" opacity="0.96" filter="url(#${p('soft4')})"/>` +
    `</g>`

  // ————— the valley floor —————
  const valley =
    `<g class="ls-valley">` +
    `<path d="M -80 1420 L -80 1052 C 180 1016 420 1074 660 1048 C 900 1022 1120 1080 1360 1054 ` +
    `C 1500 1038 1600 1058 1680 1044 L 1680 1420 Z" fill="url(#${p('fields')})"/>` +
    // cultivated patches
    `<path d="M 380 1420 C 430 1230 560 1120 760 1086 C 940 1056 1080 1104 1180 1180 L 1120 1420 Z" fill="#dcd79c" opacity="0.72"/>` +
    `<path d="M 520 1420 C 560 1280 660 1186 820 1156 C 960 1130 1046 1178 1100 1240 L 1040 1420 Z" fill="#d8b98c" opacity="0.6"/>` +
    `<path d="M 180 1300 C 320 1216 520 1170 700 1160 C 860 1152 980 1172 1080 1204" fill="none" stroke="#9fae63" stroke-width="14" opacity="0.45"/>` +
    drags(r, n(70), 120, 1400, 1060, 1360, [60, 220], [5, 15],
      ['#b9c777', '#e2dda6', '#cbab7f', '#a8b769'], [0.18, 0.46]) +
    `</g>`

  // ————— the dark slopes that fold the valley shut —————
  const hillTopLeft = (x: number) => 792 + Math.pow(Math.max(0, x + 80) / 560, 1.55) * 300
  const hillTopRight = (x: number) => 836 + Math.pow(Math.max(0, 1680 - x) / 560, 1.55) * 300

  const slopes =
    `<g class="ls-slopes">` +
    // a paler ridge just behind each, for depth
    `<path d="${SLOPE_LEFT}" fill="#4d7358" opacity="0.75" transform="translate(-46,-58)" filter="url(#${p('soft10')})"/>` +
    `<path d="${SLOPE_RIGHT}" fill="#517a5d" opacity="0.75" transform="translate(50,-62)" filter="url(#${p('soft10')})"/>` +
    `<path d="${SLOPE_LEFT}" fill="url(#${p('slopeL')})"/>` +
    `<path d="${SLOPE_RIGHT}" fill="url(#${p('slopeR')})"/>` +
    tuftedEdge(r, n(46), -70, 760, hillTopLeft, [20, 54], '#25422f') +
    tuftedEdge(r, n(44), 1740, 860, hillTopRight, [20, 54], '#284833') +
    drags(r, n(60), -80, 700, 880, 1500, [50, 190], [6, 20], ['#3f6b4d', '#223a2a', '#4a7a56'], [0.18, 0.44]) +
    drags(r, n(60), 900, w + 80, 900, 1500, [50, 190], [6, 20], ['#43704f', '#243f2e', '#528059'], [0.18, 0.44]) +
    // the hedgerow at the foot of the slopes
    `<path d="M -80 1330 C 160 1272 400 1316 620 1290 C 760 1272 880 1300 1010 1284 ` +
    `C 1220 1258 1460 1306 1680 1276 L 1680 1460 L -80 1460 Z" fill="#2a4430" opacity="0.92" filter="url(#${p('soft4')})"/>` +
    `</g>`

  const track = pathOutline()
  const field =
    `<g class="ls-field">` +
    `<path d="${ROSE_FIELD}" fill="url(#${p('field')})"/>` +
    `<path d="${ROSE_FIELD}" fill="url(#${p('bloomWash')})"/>` +
    stems(r, n(340), -60, w + 60, 1320, 2480, [24, 78], ['#3f5232', '#54693c', '#2f4326', '#6b7f45'], [0.26, 0.7]) +
    // a soft under-edge so the track is worn into the field rather than cut out
    `<path d="${track}" fill="#b9a891" opacity="0.55" filter="url(#${p('soft10')})"/>` +
    `<path d="${track}" fill="url(#${p('path')})"/>` +
    drags(r, n(120), 480, 1220, 1260, 2500, [26, 140], [4, 15], ['#f6ebdc', '#c9b096', '#e9d8c1', '#b9a084'], [0.2, 0.5]) +
    `<rect x="-80" y="700" width="${w + 160}" height="1800" fill="url(#${p('warm')})"/>` +
    bushes(r, n(26), 1340, 2440) +
    vergeGrass(r, n(90)) +
    `</g>`

  const rosesFar = `<g class="ls-roses-far">${roseField(r, n(430), 1286, 1640, [10, 20], 0)}</g>`
  const rosesMid = `<g class="ls-roses-mid">${roseField(r, n(380), 1560, 1980, [15, 28], 1)}</g>`
  const rosesNear =
    `<g class="ls-roses-near">` +
    stems(r, n(140), -60, w + 60, 1880, 2500, [44, 140], ['#3a4d2d', '#4e6338', '#2b3e23'], [0.42, 0.82], true) +
    roseField(r, n(150), 1900, 2520, [18, 36], 2) +
    `</g>`

  return (
    `<svg class="painting" viewBox="${CANVAS.x} ${CANVAS.y} ${CANVAS.w} ${CANVAS.h}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">` +
    defs +
    sky +
    distance +
    valley +
    slopes +
    field +
    rosesFar +
    rosesMid +
    `<g class="ls-props" id="${p('props')}"></g>` +
    rosesNear +
    `</svg>`
  )
}

/**
 * A tufted edge: a tight run of small crowns hugging a silhouette, so the slope
 * ends in a treeline rather than a clean vector curve.
 */
function tuftedEdge(
  r: R,
  count: number,
  from: number,
  to: number,
  y: (x: number) => number,
  size: [number, number],
  fill: string,
): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const x = from + t * (to - from) + between(r, -14, 14)
    const rad = between(r, size[0], size[1])
    const cy = y(x) + between(r, -rad * 0.35, rad * 0.8)
    const lobes = Math.round(between(r, 2, 4))
    for (let k = 0; k < lobes; k++) {
      const a = between(r, 0, Math.PI * 2)
      out +=
        `<ellipse cx="${round(x + Math.cos(a) * rad * 0.5)}" cy="${round(cy + Math.sin(a) * rad * 0.32)}" ` +
        `rx="${round(rad * between(r, 0.5, 0.9), 1)}" ry="${round(rad * between(r, 0.42, 0.8), 1)}" ` +
        `fill="${fill}" opacity="${round(between(r, 0.7, 1), 2)}"/>`
    }
  }
  return out
}

/** Stray blades leaning over the edges of the track. */
function vergeGrass(r: R, count: number): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const t = between(r, 0.08, 1)
    const y = PATH_TOP + t * (PATH_BOTTOM - PATH_TOP)
    const side = r() > 0.5 ? 1 : -1
    const x = pathCentre(t) + side * pathHalf(t) + between(r, -26, 18) * side
    const l = between(r, 18, 64) * (0.4 + t)
    if (shadesTheEgg(x, y - l * 0.7, 24)) continue
    const lean = between(r, -0.5, 0.5) * l
    out +=
      `<path d="M ${round(x)} ${round(y)} Q ${round(x + lean * 0.35)} ${round(y - l * 0.62)} ${round(x + lean)} ${round(y - l)}" ` +
      `stroke="${r() > 0.5 ? '#4e6338' : '#3a4d2d'}" stroke-width="${round(between(r, 1.2, 2.8), 2)}" ` +
      `stroke-linecap="round" fill="none" opacity="${round(between(r, 0.4, 0.8), 2)}"/>`
  }
  return out
}

/** Dark shrubs standing among the roses. */
function bushes(r: R, count: number, y0: number, y1: number): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const y = between(r, y0, y1)
    const x = between(r, -60, WORLD.w + 60)
    if (onPath(x, y, 20) || shadesTheEgg(x, y, 90)) continue
    const depth = (y - y0) / Math.max(1, y1 - y0)
    out += tree(r, x, y, between(r, 42, 120) * (0.6 + depth * 0.8), r() > 0.5 ? '#2f4326' : '#3a5130', between(r, 0.72, 0.95))
  }
  return out
}
