import path from 'node:path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        compare: path.resolve(__dirname, './index.html'),
      },
    },
  },
})
