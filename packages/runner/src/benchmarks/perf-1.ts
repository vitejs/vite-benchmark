import path from "path"

import { CASE_DIR } from "../constant"
import { Benchmark } from "../Benchmark"

export const benchmark = new Benchmark({
  dir: path.resolve(CASE_DIR, "perf-1"),
  scripts: async () => {
    await benchmark.installDeps()
    await benchmark.startServer({
      onDepsBundled: () => benchmark.stopServer(),
    })
  },
})
