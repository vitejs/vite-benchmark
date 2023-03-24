import path from "path"

import { CASE_DIR } from "../constant"
import { Benchmark } from "../Benchmark"

export const benchmark = new Benchmark({
  dir: path.resolve(CASE_DIR, "perf-1"),
  func: async () => {
    await benchmark.installDeps()
    await benchmark.startDevServer({
      onDepsBundled: () => benchmark.dumpServeProfile(),
    })
  },
})
