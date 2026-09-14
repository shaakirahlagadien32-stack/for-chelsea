/**
 * Folds the built CSS + JS back into dist/index.html so the finished card is a
 * single file you can e-mail, AirDrop or drop on any static host.
 */
import { readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const guard = (s) => s.replace(/<\/script>/gi, '<\\/script>')

const htmlPath = join(dist, 'index.html')
let html = await readFile(htmlPath, 'utf8')

const assets = await readdir(join(dist, 'assets'))
for (const file of assets) {
  const body = await readFile(join(dist, 'assets', file), 'utf8')
  if (file.endsWith('.css')) {
    html = html.replace(
      new RegExp(`\\s*<link[^>]+href="[^"]*${file}"[^>]*>`, 'i'),
      `\n    <style>\n${body}\n    </style>`,
    )
  } else if (file.endsWith('.js')) {
    html = html.replace(
      new RegExp(`\\s*<script[^>]+src="[^"]*${file}"[^>]*></script>`, 'i'),
      `\n    <script type="module">\n${guard(body)}\n    </script>`,
    )
  }
}

if (/<(script[^>]+src|link[^>]+stylesheet)/i.test(html)) {
  throw new Error('inline: an asset reference survived — dist/index.html is not self-contained')
}

await writeFile(htmlPath, html)
await rm(join(dist, 'assets'), { recursive: true, force: true })

const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
console.log(`inline: dist/index.html is self-contained (${kb} kB)`)
