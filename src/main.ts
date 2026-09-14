import './styles.css'

import { Story } from './state'
import { paintLandscape } from './art/landscape'
import { paintShells } from './art/shells'
import kitten from './assets/kitten.webp'
import { CANVAS, CLOSING, shotOn, shotToCss, stage, type Stage } from './art/world'
import { createReveal, type RevealHandle } from './systems/reveal'
import { createMotes } from './systems/motes'
import { createAmbience } from './systems/ambience'
import { mountLock } from './scenes/lock'

const $ = <T extends Element>(id: string) => document.getElementById(id) as unknown as T

const app = $<HTMLElement>('app')
const camera = $<HTMLElement>('camera')
const plateColour = $<HTMLElement>('plate-colour')
const plateMono = $<HTMLElement>('plate-mono')
const swipe = $<HTMLElement>('swipe')
const hint = $<HTMLElement>('hint')
const verse = $<HTMLElement>('verse')
const onward = $<HTMLButtonElement>('onward')
const greeting = $<HTMLElement>('greeting')
const closing = $<HTMLElement>('closing')
const announcer = $<HTMLElement>('announcer')
const soundBtn = $<HTMLButtonElement>('sound')
const motesCanvas = $<HTMLCanvasElement>('motes')

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let reduced = motionQuery.matches

const story = new Story()
const motes = createMotes(motesCanvas, reduced)
const ambience = createAmbience(new URL('audio/ambience.mp3', document.baseURI).href)

let reveal: RevealHandle | null = null
let view: Stage = stage(window.innerWidth, window.innerHeight)
/** Which framing the camera is holding. */
type Framing = 'wide' | 'closing'
let framing: Framing = 'wide'

/* ————————————————————————————————————————————————————————————
   painting the world
   ———————————————————————————————————————————————————————————— */

// Small screens get a slightly thinner scatter of brushwork — the composition is
// identical, there is simply less of it to rasterise.
const detail = Math.min(window.innerWidth, window.innerHeight) < 700 ? 0.7 : 1

plateColour.innerHTML = paintLandscape('c', detail)
plateMono.innerHTML = paintLandscape('m', detail)
;($<HTMLElement>('lock-shells')).innerHTML = paintShells()

const colourSvg = plateColour.querySelector('svg') as SVGSVGElement
const monoSvg = plateMono.querySelector('svg') as SVGSVGElement

$<HTMLImageElement>('gift-cat').src = kitten

function layout() {
  const w = window.innerWidth
  const h = window.innerHeight
  view = stage(w, h)

  // The viewBox never changes: the plate always holds the whole painting, and it
  // is the element's size and offset that decide what the viewport frames.
  const box = `${CANVAS.x} ${CANVAS.y} ${CANVAS.w} ${CANVAS.h}`
  for (const svg of [colourSvg, monoSvg]) svg.setAttribute('viewBox', box)

  const { left, top, width, height } = view.plate
  camera.style.left = `${left.toFixed(2)}px`
  camera.style.top = `${top.toFixed(2)}px`
  camera.style.width = `${width.toFixed(2)}px`
  camera.style.height = `${height.toFixed(2)}px`

  // Reframing after a rotate or a resize must snap, never tween.
  camera.classList.add('is-instant')
  applyCamera()
  paintMask(lastProgress)
  void camera.offsetWidth
  camera.classList.remove('is-instant')
}

function applyCamera() {
  if (framing === 'wide') {
    camera.style.transformOrigin = '0 0'
    camera.style.transform = 'translate3d(0,0,0) scale(1)'
    return
  }
  // The closing beat drifts gently into the meadow rather than cutting to it.
  // Gentle on purpose: a wide screen sees far more world per pixel than a phone,
  // and anything stronger buries the valley in the rose field.
  const shot = shotOn(CLOSING, view, window.innerWidth, window.innerHeight, {
    scale: 1.12,
    anchorY: 0.5,
  })
  camera.style.transformOrigin = `${shot.originX.toFixed(2)}px ${shot.originY.toFixed(2)}px`
  camera.style.transform = shotToCss(shot)
}

/**
 * The wipe is a gradient across the *viewport*, but it is painted on a plate that
 * is wider than the viewport — so the stop positions are mapped into the plate's
 * own coordinate space before they are handed to the mask.
 */
let lastProgress = 0
function paintMask(progress: number) {
  lastProgress = progress
  const cw = window.innerWidth
  const { left, width } = view.plate
  const soft = cw * 0.16
  const edge = progress * (cw + soft)
  app.style.setProperty('--mask-a', `${(((edge - soft - left) / width) * 100).toFixed(3)}%`)
  app.style.setProperty('--mask-b', `${(((edge - left) / width) * 100).toFixed(3)}%`)
}

layout()
window.addEventListener('resize', () => layout())
window.addEventListener('orientationchange', () => window.setTimeout(() => layout(), 120))

/* ————————————————————————————————————————————————————————————
   state
   ———————————————————————————————————————————————————————————— */

const SAID: Partial<Record<string, string>> = {
  BIRTHDAY_INTRO: 'Happy Birthday Chelsea.',
  COLOUR_REVEAL: 'A monochrome landscape. Swipe from left to right, or press the right arrow key, to paint the colour back in.',
  LIGHT_MESSAGE: 'you the light in everyones lives',
  CONTINUE: 'Keep going. Activate the arrow, or swipe right, to continue.',
  FINAL_MESSAGE:
    'A kitten holding a bouquet of pink lilies. wishing you a happy, healthy and blessed year further filled with love. from shaakirah.',
}

story.on((next) => {
  app.dataset['state'] = next
  const line = SAID[next]
  if (line) announcer.textContent = line
})

const wait = (ms: number, run: () => void) => window.setTimeout(run, reduced ? Math.round(ms * 0.45) : ms)

/* ————————————————————————————————————————————————————————————
   1 — the lock opens
   ———————————————————————————————————————————————————————————— */

mountLock({
  onUnlock() {
    story.advance('UNLOCKED')
    motes.setMood('dawn')
    if (ambience.enabled) ambience.enable()

    wait(1500, () => {
      story.advance('BIRTHDAY_INTRO')
      greeting.setAttribute('aria-hidden', 'false')
    })
    wait(5400, beginColourReveal)
  },
})

/* ————————————————————————————————————————————————————————————
   2 — swipe the colour back into the world
   ———————————————————————————————————————————————————————————— */

function beginColourReveal() {
  if (!story.advance('COLOUR_REVEAL')) return
  hint.setAttribute('aria-hidden', 'false')
  swipe.hidden = false
  swipe.tabIndex = 0

  reveal = createReveal({
    surface: swipe,
    reducedMotion: reduced,
    onProgress(p, edgeX, energy) {
      app.style.setProperty('--reveal', p.toFixed(4))
      app.style.setProperty('--edge', `${edgeX.toFixed(1)}px`)
      paintMask(p)
      app.style.setProperty('--energy', (energy * 0.85).toFixed(3))
      if (p > 0.05) app.classList.add('is-painting')
      motes.setMood(p > 0.55 ? 'gold' : 'dawn')
      swipe.setAttribute('aria-valuetext', p > 0.98 ? 'the colour is fully revealed' : `${Math.round(p * 100)} percent colour`)
    },
    onComplete: finishColourReveal,
  })
}

function finishColourReveal() {
  if (!story.advance('LIGHT_MESSAGE')) return
  reveal?.destroy()
  reveal = null
  swipe.hidden = true
  swipe.tabIndex = -1
  hint.setAttribute('aria-hidden', 'true')
  app.style.setProperty('--reveal', '1')
  paintMask(1)

  // The grey plate has done its work; retiring it keeps one fewer painting live.
  wait(1400, () => {
    plateMono.style.display = 'none'
  })

  wait(900, () => verse.setAttribute('aria-hidden', 'false'))
  wait(3600, () => {
    if (!story.advance('CONTINUE')) return
    onward.hidden = false
    onward.setAttribute('aria-hidden', 'false')
  })
}

/* ————————————————————————————————————————————————————————————
   3 — onward, to the last word
   ———————————————————————————————————————————————————————————— */

onward.addEventListener('click', goToClosing)

// A right-swipe anywhere continues too, for anyone who never looks at buttons.
let gestureX: number | null = null
app.addEventListener('pointerdown', (e) => {
  if (story.is('CONTINUE')) gestureX = e.clientX
})
app.addEventListener('pointerup', (e) => {
  if (gestureX !== null && story.is('CONTINUE') && e.clientX - gestureX > 56) goToClosing()
  gestureX = null
})

function goToClosing() {
  if (!story.advance('FINAL_MESSAGE')) return
  onward.disabled = true
  window.setTimeout(() => {
    onward.hidden = true
  }, 1800)

  framing = 'closing'
  applyCamera()
  motes.setMood('gold')
  motes.setDensity(1.45)

  // The words that have been on screen step aside before anything new arrives.
  greeting.setAttribute('aria-hidden', 'true')
  verse.setAttribute('aria-hidden', 'true')

  wait(1500, () => closing.setAttribute('aria-hidden', 'false'))
}

/* ————————————————————————————————————————————————————————————
   odds and ends
   ———————————————————————————————————————————————————————————— */

// Keyboard: the arrow button is a real button, so Enter/Space already work. This
// only adds the right-arrow key as a second way through the CONTINUE gate.
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' && story.is('CONTINUE')) {
    e.preventDefault()
    goToClosing()
  }
})

void ambience.ready.then((available) => {
  if (!available) return
  soundBtn.hidden = false
  soundBtn.addEventListener('click', () => {
    const on = ambience.toggle()
    soundBtn.setAttribute('aria-pressed', String(on))
    soundBtn.classList.toggle('is-on', on)
  })
})

const onMotionChange = (e: MediaQueryListEvent) => {
  reduced = e.matches
  app.classList.toggle('reduced', reduced)
}
if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange)
app.classList.toggle('reduced', reduced)

// A development-only hook so scenes can be inspected without sitting through the
// whole story. Stripped from production builds by the bundler.
if (import.meta.env.DEV) {
  Object.defineProperty(window, 'card', {
    value: {
      story,
      unlock: () => {
        for (const d of '1409') {
          document.querySelector<HTMLElement>(`[data-key="${d}"]`)?.click()
        }
      },
      paint: () => reveal?.complete(),
      onward: goToClosing,
      /** Run the whole story at speed, for a quick look at the last scene. */
      skim: () => {
        for (const d of '1409') {
          document.querySelector<HTMLElement>(`[data-key="${d}"]`)?.click()
        }
        window.setTimeout(() => reveal?.complete(), 10000)
        window.setTimeout(goToClosing, 20000)
      },
    },
  })
}

window.addEventListener('pagehide', () => {
  reveal?.destroy()
  motes.destroy()
})
