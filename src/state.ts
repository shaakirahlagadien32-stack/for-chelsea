/**
 * The card is a strictly linear story. Modelling it as an explicit machine means
 * a stray swipe, a double tap or a fast finger can never land Chelsea in a scene
 * she hasn't arrived at yet.
 */
export const STATES = [
  'LOCKED',
  'UNLOCKED',
  'BIRTHDAY_INTRO',
  'COLOUR_REVEAL',
  'LIGHT_MESSAGE',
  'CONTINUE',
  'EGG_SCENE',
  'EGG_CRACKING',
  'HATCHED',
  'FINAL_MESSAGE',
] as const

export type State = (typeof STATES)[number]

type Listener = (next: State, prev: State) => void

export class Story {
  private current: State = 'LOCKED'
  private listeners = new Set<Listener>()

  get state(): State {
    return this.current
  }

  is(s: State): boolean {
    return this.current === s
  }

  /** True once the story has reached `s` — useful for "has the reveal happened yet". */
  reached(s: State): boolean {
    return STATES.indexOf(this.current) >= STATES.indexOf(s)
  }

  /** Move to the next scene. Anything other than a single step forward is ignored. */
  advance(to: State): boolean {
    const from = STATES.indexOf(this.current)
    const next = STATES.indexOf(to)
    if (next !== from + 1) return false
    const prev = this.current
    this.current = to
    for (const l of this.listeners) l(to, prev)
    return true
  }

  on(l: Listener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
}
