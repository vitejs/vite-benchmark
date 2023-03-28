import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { createRequire } from 'node:module'
import basicSsl from '@vitejs/plugin-basic-ssl'

const require = createRequire(import.meta.url)

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
  // server: {
  //   proxy: {
  //     '/speedscope': {
  //       headers: {
  //         host: 'fi3ework.github.io',
  //       },
  //       target: `https://fi3ework.github.io/`,
  //       secure: true,
  //       // changeOrigin: true,
  //     },
  //   },
  // },
  build: {
    rollupOptions: {
      input: {
        compare: path.resolve(__dirname, './index.html'),
      },
    },
  },
})
