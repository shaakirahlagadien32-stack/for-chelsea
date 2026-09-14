/**
 * "Swipe to reveal the colour."
 *
 * Progress accumulates from relative movement rather than tracking absolute
 * finger position, which means many small strokes add up the same way one long
 * one does, a backwards swipe gently takes colour away instead of snapping, and
 * the gesture behaves identically on a 375px phone and a 27" display.
 *
 * A displayed value chases the target every frame, so even coarse, jumpy pointer
 * events come out as a smooth, physical wipe.
 */

export interface RevealHandle {
  destroy(): void
  complete(): void
}

interface Options {
  surface: HTMLElement
  onProgress(progress: number, edgeX: number, energy: number): void
  onComplete(): void
  reducedMotion: boolean
}

export function createReveal({ surface, onProgress, onComplete, reducedMotion }: Options): RevealHandle {
  let target = 0
  let shown = 0
  let energy = 0
  let settled = false
  let done = false
  let raf = 0
  let last = performance.now()
  let pointer: number | null = null
  let lastX = 0

  // Fast enough to feel attached to the finger, slow enough to stay smooth.
  const chase = reducedMotion ? 0.4 : 0.26
  // How far a finger travels to paint the whole valley: a little over half the
  // screen, so a comfortable one-thumb swipe covers real ground.
  const span = () => Math.max(140, surface.getBoundingClientRect().width * 0.55)

  function push(dx: number, gain = 1) {
    if (done) return
    target = Math.min(1, Math.max(0, target + (dx / span()) * gain))
    energy = Math.min(1, energy + Math.abs(dx) / 90)
    // Near the end, help the last sliver along so nobody is left scrubbing.
    if (target > 0.9) target = 1
    surface.setAttribute('aria-valuenow', String(Math.round(target * 100)))
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(64, now - last)
    last = now

    const k = 1 - Math.pow(1 - chase, dt / 16.667)
    shown += (target - shown) * k
    energy *= Math.pow(0.92, dt / 16.667)
    if (Math.abs(target - shown) < 0.0005) shown = target

    onProgress(shown, shown * surface.clientWidth, energy)

    if (!settled && target >= 1 && shown > 0.995) {
      settled = true
      done = true
      window.setTimeout(onComplete, 260)
    }
  }

  // ————— pointer (touch, pen, mouse) —————
  const onDown = (e: PointerEvent) => {
    if (done || pointer !== null) return
    pointer = e.pointerId
    lastX = e.clientX
    surface.setPointerCapture?.(e.pointerId)
    surface.classList.add('is-painting')
  }
  const onMove = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return
    // A fast drag can deliver several positions in one event; using all of them
    // keeps the wipe tracking the finger instead of jumping between samples.
    const points = e.getCoalescedEvents?.() ?? []
    if (points.length > 1) {
      for (const p of points) {
        push(p.clientX - lastX)
        lastX = p.clientX
      }
    } else {
      push(e.clientX - lastX)
      lastX = e.clientX
    }
    e.preventDefault()
  }
  const onUp = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return
    pointer = null
    surface.releasePointerCapture?.(e.pointerId)
    surface.classList.remove('is-painting')
  }

  // ————— trackpad / wheel —————
  const onWheel = (e: WheelEvent) => {
    if (done) return
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY * 0.5
    if (!dx) return
    push(dx, 1.1)
    e.preventDefault()
  }

  // ————— keyboard —————
  const onKey = (e: KeyboardEvent) => {
    if (done) return
    const step = span() * 0.12
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') push(step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') push(-step)
    else if (e.key === 'End' || e.key === 'Enter' || e.key === ' ') push(span())
    else if (e.key === 'Home') push(-span() * 2)
    else return
    e.preventDefault()
  }

  surface.addEventListener('pointerdown', onDown)
  surface.addEventListener('pointermove', onMove, { passive: false })
  surface.addEventListener('pointerup', onUp)
  surface.addEventListener('pointercancel', onUp)
  surface.addEventListener('wheel', onWheel, { passive: false })
  surface.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(tick)

  return {
    destroy() {
      done = true
      cancelAnimationFrame(raf)
      surface.removeEventListener('pointerdown', onDown)
      surface.removeEventListener('pointermove', onMove)
      surface.removeEventListener('pointerup', onUp)
      surface.removeEventListener('pointercancel', onUp)
      surface.removeEventListener('wheel', onWheel)
      surface.removeEventListener('keydown', onKey)
      surface.classList.remove('is-painting')
    },
    complete() {
      push(span() * 3)
    },
  }
}
