import { execa } from 'execa'
import { ensureDir, remove } from 'fs-extra'
import { copyFile, writeFile } from 'fs/promises'
import path from 'path'
import colors from 'picocolors'
import stripAnsi from 'strip-ansi'

import { CASE_DIR, UPLOAD_DIR } from './constant'

import type { ExecaChildProcess } from 'execa'

interface MetricData {}

type MetricKeys = 'devPrebundle' | 'build'
type Metric = boolean | MetricData

export class Benchmark {
  public name!: string
  public caseDir!: string
  public viteCache: string
  public dist: string
  public metrics: Partial<Record<MetricKeys, Metric>> = {}
  public debugLog = ''
  public serveChild?: ExecaChildProcess<string>
  public sha!: string

  constructor(options: {
    sha: string
    name: string
    metrics: Partial<Record<MetricKeys, Metric>>
    viteCache?: string
    dist?: string
  }) {
    this.sha = options.sha
    this.name = options.name
    this.metrics = options.metrics
    this.viteCache = path.resolve(options.viteCache ?? './node_modules/.vite')
    this.dist = path.resolve(options.dist ?? './dist')
    this.caseDir = path.resolve(CASE_DIR, this.name)
  }

  public async installDeps() {
    // https://github.com/npm/cli/issues/2339
    await execa('npm', ['i', '--install-links', '--no-save'], {
      cwd: this.caseDir,
      stdio: 'inherit',
    })
  }

  public async run() {
    await this.installDeps()
    console.log(colors.green(`Start running benchmark script`))
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
  }

  public async metricDevPrebundle() {
    await this.startServer({
      onDepsBundled: () => this.stopServer(),
    })
    await this.upload('dev-prebundle-')
    await this.clean()
  }

  public async metricBuild() {
    await this.startBuild()
    await this.upload('build-')
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
        '--cpu-prof',
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
        '--cpu-prof',
        '--cpu-prof-name=CPU.cpuprofile',
        './node_modules/vite/bin/vite.js',
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
      if (data.toString().includes('Dependencies bundled in')) {
        console.log(colors.cyan(`Server stopped`))
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

  public async upload(prefix: string) {
    const uploadDir = path.resolve(UPLOAD_DIR, this.sha)
    await ensureDir(uploadDir)
    await writeFile(
      path.resolve(uploadDir, `./${prefix}debug-log.txt`),
      stripAnsi(this.debugLog)
    )
    await copyFile(
      path.resolve(this.caseDir, './CPU.cpuprofile'),
      path.resolve(uploadDir, `./${prefix}CPU.cpuprofile`)
    )

    console.log(colors.green(`Benchmark report saved to ${uploadDir}`))
  }
}
