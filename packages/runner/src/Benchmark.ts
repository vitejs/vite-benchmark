import { execa } from "execa"
import type { ExecaChildProcess } from "execa"
import colors from "picocolors"

export class Benchmark {
  public dir!: string
  public startTime!: number
  public endTime!: number
  public duration!: number
  public func: (...args: any[]) => any = () => {}
  public debugLog = ""
  public serveChild?: ExecaChildProcess<string>

  constructor(options: {
    dir: string
    func: (...args: any[]) => void | Promise<void>
  }) {
    this.dir = options.dir
    this.func = options.func
  }

  public async installDeps() {
    await execa("npm", ["i"], {
      cwd: this.dir,
      stdio: "inherit",
    })
  }

  public async run() {
    this.startTime = Date.now()
    await this.func()
    this.end()
    this.report()
    this.dispose()
  }

  public async startDevServer({
    onDepsBundled,
  }: {
    onDepsBundled?: () => unknown
  } = {}) {
    this.serveChild = execa(
      "npm",
      ["run", "dev", "--", "--profile", "--debug", "--force"],
      {
        cwd: this.dir,
        stdio: "pipe",
        detached: true,
      }
    )

    this.serveChild.stderr?.on("data", (data: Buffer) => {
      this.debugLog += data.toString()
      if (data.toString().includes("deps bundled in")) {
        onDepsBundled?.()
      }
    })
  }

  public dumpServeProfile() {
    // TODO: how to pipe 'p' to child process?
    this.serveChild?.stdin?.write("p")
    this.serveChild?.stdin?.end()
  }

  public end() {
    this.endTime = Date.now()
    this.duration = this.endTime - this.startTime
  }

  public report() {
    console.log(colors.cyan(`Duration: ${this.duration}ms`))
  }

  public dispose() {}
}
