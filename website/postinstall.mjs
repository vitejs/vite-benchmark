import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function cpSpeedScope() {
  const speedScopePath = require.resolve('speedscope/package.json')
  const speedScopeReleasePath = path.resolve(speedScopePath, '../dist/release')
  console.log('Start copying speedscope from', speedScopeReleasePath)
  const dest = path.resolve(__dirname, './public/speedscope')
  await fs.cp(speedScopeReleasePath, dest, { recursive: true })
  console.log('speedscope copied to', dest)
}

cpSpeedScope()
