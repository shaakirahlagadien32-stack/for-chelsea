import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024,
    rollupOptions: { output: { entryFileNames: 'assets/card.js', assetFileNames: 'assets/card.[ext]' } },
  },
})
