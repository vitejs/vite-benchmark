import colors from "picocolors"

export class Measure {
  public startTime: number = 0
  public endTime: number = 0
  public duration: number = 0
  public func: (...args: any[]) => any = () => {}

  constructor(options: { func: (...args: any[]) => void | Promise<void> }) {
    this.func = options.func
  }

  public async run() {
    this.startTime = Date.now()
    await this.func()
    this.end()
    this.report()
    this.dispose()
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
