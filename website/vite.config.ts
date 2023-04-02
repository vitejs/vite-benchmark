import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  base: '/vite-benchmark/',
  optimizeDeps: {
    exclude: ['sss'],
  },
  plugins: [react(), basicSsl()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        commit: path.resolve(__dirname, './commit/index.html'),
        compare: path.resolve(__dirname, './compare/index.html'),
      },
    },
  },
})
