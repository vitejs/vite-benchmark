import { benchmark as perf1Bench } from './cases/perf-1'
import fsExtra from 'fs-extra'
import { CASE_TEMP_DIR, CASE_DIR } from './constant'
import path from 'path'
import colors from 'picocolors'
import { execa } from 'execa'

export async function runBenchmarks({
  viteDistDir,
  uniqueKey,
}: {
  viteDistDir: string
  uniqueKey: string
}) {
  console.log(
    colors.cyan(`Running benchmarks of ${decodeURIComponent(uniqueKey)}`)
  )
  // await fsExtra.remove(CASE_TEMP_DIR)
  // await fsExtra.copy(CASE_DIR, CASE_TEMP_DIR)
  // await fsExtra.copy(viteDistDir, path.resolve(CASE_TEMP_DIR, './vite'))

  // await execa('pnpm', ['i'], {
  //   cwd: CASE_TEMP_DIR,
  //   stdio: 'inherit',
  // })

  await perf1Bench({ uniqueKey }).run()
}
