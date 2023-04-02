import AdmZip from 'adm-zip'
import { execa } from 'execa'
import { ensureDir, remove } from 'fs-extra'
import { copyFile, writeFile } from 'fs/promises'
import path from 'path'
import colors from 'picocolors'
import stripAnsi from 'strip-ansi'

import { CASE_TEMP_DIR, UPLOAD_DIR, UPLOAD_DIR_TEMP } from './constant'

import type { ExecaChildProcess } from 'execa'
interface MetricData {}

type MetricKeys = 'devPrebundle' | 'build'
type Metric = boolean | MetricData

const nodeArgs = [
  '--no-turbo-inlining',
  '--cpu-prof',
  '--cpu-prof-interval',
  '100',
] as const

export class Benchmark {
  public name!: string
  public caseDir!: string
  public dist: string
  public metrics: Partial<Record<MetricKeys, Metric>> = {}
  public debugLog = ''
  public serveChild?: ExecaChildProcess<string>
  public uniqueKey: string

  constructor(options: {
    uniqueKey: string
    name: string
    metrics: Partial<Record<MetricKeys, Metric>>
    dist?: string
  }) {
    this.uniqueKey = options.uniqueKey
    this.name = options.name
    this.metrics = options.metrics
    this.dist = path.resolve(options.dist ?? './dist')
    this.caseDir = path.resolve(CASE_TEMP_DIR, this.name)
  }

  // public async installDeps() {
  //   // https://github.com/npm/cli/issues/2339
  //   await execa('pnpm', ['i', ], {
  //     cwd: this.caseDir,
  //     stdio: 'inherit',
  //   })
  // }

  public async run() {
    // await this.installDeps()
    console.log(colors.green(`Start running benchmark script`))
    await remove(UPLOAD_DIR_TEMP)
    for (const [key, value] of Object.entries(this.metrics)) {
      console.log(colors.green(`Start running benchmark ${key}`))
      switch (key as MetricKeys) {
        case 'devPrebundle':
          await this.metricDevPrebundle()
          break
        case 'build':
          await this.metricBuild()
          break
        default:
          break
      }
      console.log(colors.green(`Finish running benchmark ${key}`))
    }

    this.packUpload()
  }

  public async metricDevPrebundle() {
    const timeoutHandler = setTimeout(() => {
      if (this.serveChild?.killed) return
      console.log(colors.red(`Timeout for dev-prebundle`))
      console.log(this.serveChild?.killed)
      this.stopServer()
    }, 60 * 1000)

    await this.startServer({
      onDepsBundled: () => {
        this.stopServer()
        clearTimeout(timeoutHandler)
      },
    })

    await this.prepareUpload('dev-prebundle-')
    await this.clean()
  }

  public async metricBuild() {
    await this.startBuild()
    await this.prepareUpload('build-')
    await this.clean()
  }

  public async clean() {
    await remove(path.resolve(this.caseDir, './node_modules/.vite'))
    await remove(path.resolve(this.caseDir, './dist'))
    this.stopServer()
    this.debugLog = ''
  }

  public async startBuild() {
    const buildProcess = execa(
      'node',
      [
        ...nodeArgs,
        '--cpu-prof-name=CPU.cpuprofile',
        './node_modules/vite/bin/vite.js',
        'build',
        '--debug',
      ],
      {
        cwd: this.caseDir,
        stdio: 'pipe',
        detached: true,
      }
    )

    const stdFn = (data: Buffer) => {
      this.debugLog += data.toString()
    }

    buildProcess.stderr?.on('data', stdFn)
    buildProcess.stdout?.on('data', stdFn)

    await buildProcess
  }

  public async startServer({
    onDepsBundled,
  }: {
    onDepsBundled?: () => unknown
  } = {}) {
    this.serveChild = execa(
      'node',
      [
        ...nodeArgs,
        '--cpu-prof-name=CPU.cpuprofile',
        '../node_modules/.pnpm/file+vite/node_modules/vite/bin/vite.js',
        'dev',
        '--debug',
        '--force',
      ],
      {
        cwd: this.caseDir,
        stdio: 'pipe',
        detached: true,
      }
    )

    let resolveServer: (value: unknown) => void
    const serverPromise = new Promise((resolve) => {
      resolveServer = resolve
    })

    this.serveChild.stderr?.on('data', (data: Buffer) => {
      this.debugLog += data.toString()
      if (
        data.toString().includes('deps bundled in') ||
        data.toString().includes('Dependencies bundled in')
      ) {
        console.log(colors.cyan(`Dev server stopped`))
        onDepsBundled?.()
      }
    })

    this.serveChild.on('exit', () => {
      resolveServer(1)
    })

    return serverPromise
  }

  public stopServer() {
    this.serveChild?.kill('SIGTERM', {
      forceKillAfterTimeout: 2000,
    })
  }

  public async prepareUpload(prefix: string) {
    await ensureDir(UPLOAD_DIR_TEMP)
    await writeFile(
      path.resolve(UPLOAD_DIR_TEMP, `./${prefix}debug-log.txt`),
      stripAnsi(this.debugLog)
    )

    await copyFile(
      path.resolve(this.caseDir, './CPU.cpuprofile'),
      path.resolve(UPLOAD_DIR_TEMP, `./${prefix}CPU.cpuprofile`)
    )
  }

  public packUpload() {
    const zip = new AdmZip()
    zip.addLocalFolder(UPLOAD_DIR_TEMP)
    const zipDestPath = path.resolve(UPLOAD_DIR, `${this.uniqueKey}.zip`)
    zip.writeZip(zipDestPath)
    console.log(colors.green(`Benchmark report saved to ${zipDestPath}`))
  }
}
