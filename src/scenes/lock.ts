/**
 * The lock.
 *
 * The passcode is entered on an on-screen keypad, so the card never depends on
 * a phone raising its own keyboard over the interface — and a physical keyboard
 * works too, without anything needing to be focused first.
 *
 * A wrong code never reloads, never navigates and never hints at what is behind
 * it: the dots simply tremble and empty themselves.
 */

const PASSCODE = '1409'
const LENGTH = PASSCODE.length

export interface LockOptions {
  onUnlock(): void
}

export function mountLock({ onUnlock }: LockOptions): void {
  const lock = document.getElementById('lock') as HTMLElement
  const form = document.getElementById('lock-form') as HTMLFormElement
  const dots = document.getElementById('dots') as HTMLElement
  const note = document.getElementById('lock-note') as HTMLElement
  const entry = document.getElementById('entry') as HTMLElement
  const keypad = document.getElementById('keypad') as HTMLElement
  const unlock = document.getElementById('unlock') as HTMLButtonElement

  const cells = Array.from(dots.querySelectorAll<HTMLElement>('.dot'))
  let code = ''
  let busy = false
  let pending = 0

  const paint = () => {
    cells.forEach((c, i) => c.classList.toggle('is-filled', i < code.length))
    unlock.disabled = code.length !== LENGTH || busy
    entry.textContent = code.length ? `${code.length} of ${LENGTH} digits entered` : ''
  }

  const refuse = () => {
    busy = true
    dots.classList.add('is-wrong')
    note.textContent = 'not quite — try again'
    window.setTimeout(() => {
      code = ''
      dots.classList.remove('is-wrong')
      paint()
      busy = false
    }, 620)
  }

  const accept = () => {
    busy = true
    unlock.disabled = true
    note.textContent = ''
    dots.classList.add('is-right')
    lock.classList.add('is-opening')
    window.setTimeout(() => {
      lock.hidden = true
      lock.setAttribute('inert', '')
      onUnlock()
    }, 1250)
  }

  const attempt = () => {
    if (busy || code.length !== LENGTH) return
    if (code === PASSCODE) accept()
    else refuse()
  }

  const press = (key: string) => {
    if (busy) return
    window.clearTimeout(pending)
    if (key === 'erase') {
      code = code.slice(0, -1)
    } else if (code.length < LENGTH) {
      code += key
    }
    if (note.textContent) note.textContent = ''
    paint()
    // The fourth digit opens the card on its own; the Unlock button is there for
    // anyone who would rather press it.
    if (code.length === LENGTH) pending = window.setTimeout(attempt, 420)
  }

  keypad.addEventListener('click', (e) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset['key']
    if (key) press(key)
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    window.clearTimeout(pending)
    attempt()
  })

  // A physical keyboard works without anything being focused — but if a button
  // already has focus, let the button handle its own Enter and Space.
  window.addEventListener('keydown', (e) => {
    if (lock.hidden || e.metaKey || e.ctrlKey || e.altKey) return
    if (/^[0-9]$/.test(e.key)) press(e.key)
    else if (e.key === 'Backspace' || e.key === 'Delete') press('erase')
    else if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button')) attempt()
    else return
    e.preventDefault()
  })

  paint()
}
