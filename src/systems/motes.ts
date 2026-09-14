/**
 * Atmosphere: dust and pollen drifting through the air, in front of the camera
 * rather than in the painting, so it keeps its scale when the camera pushes in.
 */

type Mood = 'night' | 'dawn' | 'gold'

const PALETTE: Record<Mood, [number, number, number]> = {
  night: [206, 214, 226],
  dawn: [236, 228, 208],
  gold: [255, 226, 166],
}

interface Mote {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
  speed: number
}

export interface MoteField {
  setMood(mood: Mood): void
  setDensity(scale: number): void
  destroy(): void
}

export function createMotes(canvas: HTMLCanvasElement, reducedMotion: boolean): MoteField {
  const ctx = canvas.getContext('2d', { alpha: true })
  let motes: Mote[] = []
  let w = 0
  let h = 0
  let dpr = 1
  let mood: Mood = 'night'
  let blend = { r: 206, g: 214, b: 226 }
  let density = 1
  let raf = 0
  let last = performance.now()

  function build(fresh = false) {
    const area = (w * h) / (1920 * 1080)
    const count = Math.round(Math.min(96, Math.max(18, 74 * area + 18)) * density)
    if (fresh || motes.length === 0) {
      motes = Array.from({ length: count }, () => spawn(true))
    } else if (count > motes.length) {
      // Growing the field mid-scene must not blink the existing motes away.
      while (motes.length < count) motes.push(spawn(false))
    } else {
      motes.length = count
    }
  }

  function spawn(anywhere: boolean): Mote {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 20,
      r: 0.6 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 5,
      vy: -(3 + Math.random() * 9),
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    }
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    build(true)
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (!ctx) return
    const dt = Math.min(50, now - last) / 1000
    last = now

    const goal = PALETTE[mood]
    blend = {
      r: blend.r + (goal[0] - blend.r) * Math.min(1, dt * 1.2),
      g: blend.g + (goal[1] - blend.g) * Math.min(1, dt * 1.2),
      b: blend.b + (goal[2] - blend.b) * Math.min(1, dt * 1.2),
    }
    const rgb = `${Math.round(blend.r)},${Math.round(blend.g)},${Math.round(blend.b)}`
    const drift = reducedMotion ? 0.25 : 1

    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]
      if (!m) continue
      m.phase += dt * m.speed
      m.x += (m.vx + Math.sin(m.phase) * 7) * dt * drift
      m.y += m.vy * dt * drift
      if (m.y < -24 || m.x < -30 || m.x > w + 30) motes[i] = spawn(false)

      const twinkle = 0.35 + Math.sin(m.phase * 1.3) * 0.3
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${rgb},${(0.16 + twinkle * 0.3).toFixed(3)})`
      ctx.fill()
    }
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', resize)
  raf = requestAnimationFrame(frame)

  return {
    setMood(next) {
      mood = next
    },
    setDensity(scale) {
      density = scale
      build()
    },
    destroy() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
    },
  }
}
