/**
 * Repackages the built card for Artifact hosting.
 *
 * An Artifact supplies its own <!doctype>/<head>/<body> skeleton, so the page is
 * handed over as bare content: the title first (only the first 8 kB is scanned
 * for it), then the styles, then the markup and script.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = await readFile(join(root, 'dist', 'index.html'), 'utf8')

const pick = (re, what) => {
  const m = html.match(re)
  if (!m?.[1]) throw new Error(`artifact: could not find ${what} in dist/index.html`)
  return m[1]
}

const title = pick(/<title>([\s\S]*?)<\/title>/i, 'the title')
const style = pick(/<style>([\s\S]*?)<\/style>/i, 'the stylesheet')
const script = pick(/<script type="module">([\s\S]*?)<\/script>/i, 'the script')

// Vite hoists the module script into <head>, so it is lifted out on its own and
// re-attached after the markup rather than being read out of <body>.
const body = pick(/<body>([\s\S]*?)<\/body>/i, 'the body')
  .replace(/<script type="module">[\s\S]*?<\/script>/i, '')
  .trim()

const out =
  `<title>${title}</title>\n<style>${style}</style>\n${body}\n` +
  `<script type="module">${script}</script>\n`

if (/<!doctype|<html[ >]|<head[ >]|<body[ >]/i.test(out)) {
  throw new Error('artifact: document wrapper survived the transform')
}
// Sentinels that survive minification: markup, a string literal from the
// painting, and the passcode itself.
for (const [needle, what] of [
  ['id="app"', 'the app markup'],
  ['preserveAspectRatio', 'the painting'],
  ['1409', 'the passcode'],
]) {
  if (!out.includes(needle)) throw new Error(`artifact: ${what} is missing from the output`)
}

const path = join(root, 'dist', 'artifact.html')
await writeFile(path, out)
console.log(`artifact: dist/artifact.html ready (${(Buffer.byteLength(out) / 1024).toFixed(1)} kB)`)
