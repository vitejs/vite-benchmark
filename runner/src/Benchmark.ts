import { execa } from 'execa'
import { ensureDir } from 'fs-extra'
import { copyFile, writeFile } from 'fs/promises'
import path from 'path'
import colors from 'picocolors'

import { UPLOAD_DIR } from './constant'

import type { ExecaChildProcess } from 'execa'
export class Benchmark {
  public dir!: string
  public startTime!: number
  public endTime!: number
  public duration!: number
  public scripts: (...args: any[]) => any = () => {}
  public debugLog = ''
  public serveChild?: ExecaChildProcess<string>

  constructor(options: {
    dir: string
    scripts: (...args: any[]) => void | Promise<void>
  }) {
    this.dir = options.dir
    this.scripts = options.scripts
  }

  public async installDeps() {
    // https://github.com/npm/cli/issues/2339
    await execa('npm', ['i', '--install-links'], {
      cwd: this.dir,
      stdio: 'inherit',
    })
  }

  public async run() {
    await this.installDeps()
    console.log(colors.green(`Start running benchmark script`))
    this.startTime = Date.now()
    await this.scripts()
    this.endTime = Date.now()
    console.log(colors.green(`Finish running benchmark script`))
    this.duration = this.endTime - this.startTime
    this.report()
    this.dispose()
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
        '../../vite/bin/vite.js',
        'dev',
        '--debug',
        '--force',
      ],
      {
        cwd: this.dir,
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

  public async report() {
    await ensureDir(UPLOAD_DIR)
    await writeFile(path.resolve(UPLOAD_DIR, './debug-log.txt'), this.debugLog)
    await copyFile(
      path.resolve(this.dir, './CPU.cpuprofile'),
      path.resolve(UPLOAD_DIR, './CPU.cpuprofile')
    )
    console.log(colors.green(`Benchmark report saved to ${UPLOAD_DIR}`))
  }

  public dispose() {}
}
