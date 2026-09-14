/**
 * The hatching.
 *
 * Deliberately unhurried — roughly eighteen seconds from "an egg is sitting in
 * the grass" to "oh". The stages are only ever a `data-stage` number on the egg
 * group; every movement itself lives in CSS, so honouring reduced motion is a
 * matter of running a shorter score rather than a different animation.
 */

export interface HatchCallbacks {
  onStage(stage: number): void
  onCracking(): void
  onHatched(): void
  onSettled(): void
}

export interface HatchHandle {
  cancel(): void
}

type Beat = [ms: number, run: () => void]

export function runHatch(egg: SVGGElement, reducedMotion: boolean, cb: HatchCallbacks): HatchHandle {
  const timers: number[] = []
  const stage = (n: number) => () => {
    egg.dataset['stage'] = String(n)
    cb.onStage(n)
  }

  const score: Beat[] = reducedMotion
    ? [
        [0, stage(1)],
        [600, stage(2)],
        [600, cb.onCracking],
        [1500, stage(3)],
        [2400, stage(4)],
        [3100, stage(5)],
        [3800, stage(6)],
        [4900, cb.onHatched],
        [5900, cb.onSettled],
      ]
    : [
        [0, stage(1)], //  the egg simply sits there
        [2700, stage(2)], //  one hairline crack
        [2700, cb.onCracking],
        [5400, stage(3)], //  it lengthens, and others answer it
        [7700, stage(4)], //  something inside shifts
        [9900, stage(5)], //  the wobble
        [12800, stage(6)], //  the shell gives way
        [14300, stage(7)], //  and a small warm thing climbs out
        [16400, cb.onHatched],
        [18200, cb.onSettled],
      ]

  for (const [ms, run] of score) timers.push(window.setTimeout(run, ms))

  return {
    cancel() {
      for (const t of timers) window.clearTimeout(t)
    },
  }
}
