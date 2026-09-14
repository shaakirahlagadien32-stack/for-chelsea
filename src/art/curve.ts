/** Catmull-Rom through a ring of points, emitted as cubic beziers. */
export function smoothClosed(pts: Array<[number, number]>, tension = 1): string {
  const n = pts.length
  if (n < 3) return ''
  const at = (i: number) => pts[((i % n) + n) % n] as [number, number]
  const f = (v: number) => Number(v.toFixed(2))

  const start = at(0)
  let d = `M ${f(start[0])} ${f(start[1])}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d} Z`
}

/** Catmull-Rom through an open run of points. */
export function smoothOpen(pts: Array<[number, number]>, tension = 1): string {
  const n = pts.length
  if (n < 2) return ''
  const at = (i: number) => pts[Math.min(n - 1, Math.max(0, i))] as [number, number]
  const f = (v: number) => Number(v.toFixed(2))

  const start = at(0)
  let d = `M ${f(start[0])} ${f(start[1])}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d += ` C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}
