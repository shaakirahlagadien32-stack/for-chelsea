/**
 * Optional ambient sound.
 *
 * The card is built to be silent. Drop a file at `public/audio/ambience.mp3` and
 * a small speaker control appears; leave it out and nothing changes. Playback is
 * only ever started from a real user gesture (the Unlock tap), so no browser
 * autoplay policy is ever tested.
 */

export interface Ambience {
  ready: Promise<boolean>
  enabled: boolean
  enable(): void
  disable(): void
  toggle(): boolean
}

export function createAmbience(src: string, volume = 0.22): Ambience {
  const el = new Audio()
  el.loop = true
  el.preload = 'auto'
  el.volume = 0
  el.crossOrigin = 'anonymous'

  // A dev server happily answers a missing .mp3 with an HTML page, and some
  // browsers will sit on that without firing `error` — so ask what the file
  // actually is before wiring up a control for it.
  const ready = (async () => {
    try {
      const head = await fetch(src, { method: 'HEAD' })
      if (!head.ok) return false
      if (!(head.headers.get('content-type') ?? '').toLowerCase().startsWith('audio/')) return false
    } catch {
      return false
    }
    return new Promise<boolean>((resolve) => {
      let done = false
      const settle = (ok: boolean) => {
        if (done) return
        done = true
        resolve(ok)
      }
      el.addEventListener('canplaythrough', () => settle(true), { once: true })
      el.addEventListener('error', () => settle(false), { once: true })
      window.setTimeout(() => settle(false), 8000)
      el.src = src
    })
  })()

  let fade = 0
  const to = (goal: number, onDone?: () => void) => {
    window.clearInterval(fade)
    fade = window.setInterval(() => {
      const step = goal > el.volume ? 0.012 : -0.02
      const next = el.volume + step
      if ((step > 0 && next >= goal) || (step < 0 && next <= goal)) {
        el.volume = Math.max(0, Math.min(1, goal))
        window.clearInterval(fade)
        onDone?.()
      } else {
        el.volume = Math.max(0, Math.min(1, next))
      }
    }, 40)
  }

  const api: Ambience = {
    ready,
    enabled: false,
    enable() {
      api.enabled = true
      void el.play().catch(() => {
        api.enabled = false
      })
      to(volume)
    },
    disable() {
      api.enabled = false
      to(0, () => el.pause())
    },
    toggle() {
      if (api.enabled) api.disable()
      else api.enable()
      return api.enabled
    },
  }
  return api
}
