import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { ensureDir, remove } from 'fs-extra'
import { copyFile, writeFile } from 'fs/promises'
import path from 'path'
import playwright from 'playwright'
import stripAnsi from 'strip-ansi'
import kill from 'tree-kill'

import { UPLOAD_DIR_TEMP } from './constant'

import type { ExecaChildProcess } from 'execa'
type Metrics = {
  /** cold only or cold and hot */
  devStart: 'cold' | 'both'
  build: boolean
}

export const browser = await playwright.chromium.launch()

export class ServeBench {
  public id!: string
  public metrics: Partial<Metrics> = {}
  public debugLog = ''
  public script: string
  public caseDir: string
  public port: number
  public viteCache: string
  public child?: ChildProcessWithoutNullStreams
  public serveChild?: ExecaChildProcess<string>
  // public uniqueKey: string
  public hot: boolean

  constructor(options: {
    // uniqueKey: string
    id: string
    script: string
    viteCache: string
    casesDir: string
    port: number
    hot?: boolean
  }) {
    // this.uniqueKey = options.uniqueKey
    this.id = options.id
    this.script = options.script
    this.viteCache = options.viteCache
    this.port = options.port
    this.caseDir = path.resolve(options.casesDir, this.id)
    this.hot = options.hot ?? false
  }

  public async run() {
    await this.cleanCache()
    console.log(`Running ${this.caseDir} ${this.id}`)
    const totalResult: Record<'startup' | 'serverStart' | 'fcp', number> = {
      startup: 0,
      serverStart: 0,
      fcp: 0,
    }

    const page = await (await browser.newContext()).newPage()
    await new Promise((resolve) => setTimeout(resolve, 1000)) // give some rest

    const fcpPromise = new Promise((resolve) => {
      page.on('console', (msg) => {
        const regRes = /\[vite-perf\]: (.*) (\d+(?:\.\d+)?)ms/.exec(msg.text())
        if (regRes) {
          const [, type, time] = regRes
          // @ts-ignore
          totalResult[type] = Number(time)
          resolve(undefined)
        }
      })
    })

    const loadPromise = page.waitForEvent('load')
    const pageLoadStart = Date.now()
    const serverStartTime = await this.startServer()
    page.goto(`http://localhost:${this.port}`)
    await loadPromise
    await fcpPromise
    totalResult.startup += Date.now() - pageLoadStart
    if (serverStartTime !== null) {
      totalResult.serverStart += serverStartTime
    }

    this.stopServer()
    await page.close()
    await new Promise((resolve) => setTimeout(resolve, 1000)) // give some rest

    return totalResult
  }

  public async startServer() {
    const child = spawn(`npm`, ['run', this.script], {
      stdio: 'pipe',
      shell: true,
      cwd: this.caseDir,
      env: { ...process.env, NO_COLOR: '1' },
    })
    this.child = child
    const startedRegex = /ready in (.+) ms/

    return new Promise<number>((resolve, reject) => {
      child.stdout.on('data', (bufferData) => {
        const data = bufferData.toString()
        const match = startedRegex.exec(data)
        if (match?.[1]) {
          resolve(Number(match[1]))
        }
      })
      child.on('error', (error) => {
        console.log(`${this.id} error: ${error.message}`)
        reject(error)
      })
      child.on('exit', (code) => {
        if (code !== null && code !== 0 && code !== 1) {
          console.log(`${this.id} exit: ${code}`)
          reject(code)
        }
      })
    })
  }

  public stopServer() {
    if (this.child) {
      this.child.stdout.destroy()
      this.child.stderr.destroy()
      if (this.child.pid) {
        kill(this.child.pid)
      }
    }
  }

  public async cleanCache() {
    const cacheDir = path.resolve(this.caseDir, this.viteCache)
    // console.log('cleaning cache', cacheDir)
    await remove(cacheDir)
  }

  public async prepareUpload(prefix: string) {
    await ensureDir(UPLOAD_DIR_TEMP)
    await writeFile(
      path.resolve(UPLOAD_DIR_TEMP, `./${this.id}-${prefix}debug-log.txt`),
      stripAnsi(this.debugLog)
    )

    await copyFile(
      path.resolve(this.caseDir, './cpu.cpuprofile'),
      path.resolve(UPLOAD_DIR_TEMP, `./${this.id}-${prefix}cpu.cpuprofile`)
    )
  }

  public packUpload() {
    // const zip = new AdmZip()
    // zip.addLocalFolder(UPLOAD_DIR_TEMP)
    // const zipDestPath = path.resolve(UPLOAD_DIR, `${this.uniqueKey}.zip`)
    // zip.writeZip(zipDestPath)
    // console.log(colors.green(`Benchmark report saved to ${zipDestPath}`))
  }
}
