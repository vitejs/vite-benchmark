import { benchmark as perf1 } from "./cases/perf-1"

export async function runBenchmarks({
  viteDir,
  viteBin,
}: {
  viteDir: string
  viteBin: string
}) {
  // perf-1
  perf1.run()
}
