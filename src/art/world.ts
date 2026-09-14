/**
 * One world, two scenes.
 *
 * Everything — sky, slopes, roses — lives in a single painted rectangle. Moving
 * from the wide opening view to the closing one is a real camera move across
 * that painting, which is why the two scenes feel like one place.
 *
 * The plate element is sized to the *whole* canvas rather than to the viewport,
 * and positioned so that, untransformed, the viewport happens to frame the wide
 * shot. Pushing in is then a plain CSS scale: the paint never runs out at the
 * edges, and the move composites on the GPU instead of re-rasterising the
 * painting's soft blurs on every frame.
 */

export const WORLD = { w: 1600, h: 2000 } as const

/** The rectangle that actually has paint on it. */
export const CANVAS = { x: -80, y: -80, w: 1760, h: 2480 } as const

/** Where the wide shot is centred. */
export const FOCUS = { x: 800, y: 1200 } as const

/** Where the camera drifts for the closing scene. */
export const CLOSING = { x: 840, y: 1300 } as const

export interface Frame {
  x: number
  y: number
  w: number
  h: number
}

export interface Stage {
  /** The world window the viewport shows when the camera is at rest. */
  frame: Frame
  /** CSS pixels per world unit. */
  sigma: number
  /** The plate element's box, in viewport coordinates. */
  plate: { left: number; top: number; width: number; height: number }
}

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi))

/**
 * Choose the resting frame: wide screens see the full width and lose sky and
 * field, tall phones keep the full height and crop gently inward — never so far
 * that the composition stops working.
 */
function frame(cw: number, ch: number): Frame {
  const aspect = Math.max(0.2, cw / Math.max(1, ch))
  let w = clamp(2320 * aspect, 900, WORLD.w)
  let h = w / aspect
  if (h > CANVAS.h) {
    h = CANVAS.h
    w = h * aspect
  }
  return {
    x: clamp(FOCUS.x - w / 2, CANVAS.x, CANVAS.x + CANVAS.w - w),
    y: clamp(FOCUS.y - h / 2, CANVAS.y, CANVAS.y + CANVAS.h - h),
    w,
    h,
  }
}

export function stage(cw: number, ch: number): Stage {
  const f = frame(cw, ch)
  const sigma = cw / f.w
  return {
    frame: f,
    sigma,
    plate: {
      left: (CANVAS.x - f.x) * sigma,
      top: (CANVAS.y - f.y) * sigma,
      width: CANVAS.w * sigma,
      height: CANVAS.h * sigma,
    },
  }
}

export interface Shot {
  originX: number
  originY: number
  translateX: number
  translateY: number
  scale: number
}

/** Ease in on a world point, seating it at `anchorY` down the viewport. */
export function shotOn(
  world: { x: number; y: number },
  st: Stage,
  cw: number,
  ch: number,
  opts: { anchorY?: number; scale?: number } = {},
): Shot {
  const scale = clamp(opts.scale ?? 1.3, 1, 7)

  // where the point already sits in the viewport, before any transform
  const restX = (world.x - st.frame.x) * st.sigma
  const restY = (world.y - st.frame.y) * st.sigma

  // transform-origin is measured from the plate's own top-left corner
  const originX = (world.x - CANVAS.x) * st.sigma
  const originY = (world.y - CANVAS.y) * st.sigma

  let translateX = cw / 2 - restX
  let translateY = ch * (opts.anchorY ?? 0.46) - restY

  // Whatever the aspect ratio, the painting must still cover the screen: hold the
  // transformed plate over the viewport rather than trusting the canvas to be big
  // enough in every direction.
  const fit = (t: number, edge: number, origin: number, span: number, viewport: number) => {
    const lead = edge + origin * (1 - scale)
    const size = span * scale
    if (size < viewport) return t // nothing sensible to do; let it sit centred
    return clamp(t, viewport - size - lead, -lead)
  }
  translateX = fit(translateX, st.plate.left, originX, st.plate.width, cw)
  translateY = fit(translateY, st.plate.top, originY, st.plate.height, ch)

  return { originX, originY, translateX, translateY, scale }
}

export function shotToCss(shot: Shot): string {
  return `translate3d(${shot.translateX.toFixed(2)}px, ${shot.translateY.toFixed(2)}px, 0) scale(${shot.scale.toFixed(4)})`
}
