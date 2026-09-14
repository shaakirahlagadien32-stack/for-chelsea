/** Deterministic PRNG — the landscape must paint itself identically every visit. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
export const round = (n: number, dp = 1) => Number(n.toFixed(dp))
