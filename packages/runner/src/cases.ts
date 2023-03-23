import { execa } from "execa"
import path from "path"

import { CASE_DIR } from "./constant"
import { Measure } from "./meatures"

const perf1 = path.resolve(CASE_DIR, "perf-1")

export async function runCases({
  viteDir,
  viteBin,
}: {
  viteDir: string
  viteBin: string
}) {
  // build time
  const measure = new Measure({
    func: async () => {
      await execa("npm", ["run", "build"], {
        cwd: perf1,
        stdio: "inherit",
      })
    },
  })

  await measure.run()
}
