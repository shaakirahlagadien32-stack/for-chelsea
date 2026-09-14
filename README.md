# For Chelsea

An interactive birthday card. One page, one story, no runtime dependencies.

```bash
npm install
npm run dev      # http://localhost:5180
```

```bash
npm run build    # type-check, bundle, then fold everything into one file
```

`npm run build` writes **`dist/index.html`** — a single self-contained file
(~62 kB) with the artwork, styles and script inlined. Email it, AirDrop it, or
drop it on any static host; it needs no server.

## The passcode

`1409`. A wrong code never reloads and never reveals anything: the dots tremble,
empty themselves, and wait. The story below the lock is not in the document's
readable surface until the lock opens.

## The story

A strict, linear state machine (`src/state.ts`) — a stray swipe or a double tap
can never land somewhere that hasn't been reached yet:

```
LOCKED → UNLOCKED → BIRTHDAY_INTRO → COLOUR_REVEAL → LIGHT_MESSAGE
      → CONTINUE → EGG_SCENE → EGG_CRACKING → HATCHED → FINAL_MESSAGE
```

## The artwork

Everything is drawn in code — no images anywhere.

- `src/art/landscape.ts` — the valley, painted once in full colour. The
  monochrome half of the card is the *same* markup rendered a second time under
  a warm-graphite CSS filter, so the two plates line up exactly and the swipe can
  wipe cleanly between them.
- `src/art/shells.ts` — the seashell drawing behind the passcode screen.
- `src/art/egg.ts` — the egg, and what is inside it.
- `src/art/world.ts` — the camera. Both scenes are the same painting; moving
  between them is a real camera push, not a cut.

## Optional sound

Drop a file at `public/audio/ambience.mp3` and a small speaker control appears.
Leave it out and nothing changes — the card is built to be silent, and playback
only ever starts from the unlock tap, so no autoplay policy is ever tested.

## Layout

Mobile first, and one-finger comfortable. The framing adapts to the viewport:
wide screens see the full width of the valley and lose sky and field; tall phones
keep the full height and crop gently inward.

`prefers-reduced-motion` is honoured throughout — the same story, told with
crossfades instead of movement, on a shorter score.
