import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Multi-page build: each HTML file becomes its own page in dist/
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        developer: fileURLToPath(new URL('./developer.html', import.meta.url)),
        musician: fileURLToPath(new URL('./musician.html', import.meta.url)),
      },
    },
  },
})
