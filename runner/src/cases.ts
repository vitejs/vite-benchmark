import { execa } from 'execa'
import fsExtra from 'fs-extra'
import path from 'path'
import colors from 'picocolors'

import { Bench } from './Bench'
import { CASE_DIR, CASE_TEMP_DIR, UPLOAD_DIR_TEMP } from './constant'

export const perf1 = ({ uniqueKey }: { uniqueKey: string }) =>
  new Bench({
    uniqueKey,
    name: 'perf-1',
    metrics: {
      devStart: 'both',
      build: true,
    },
  })

export const perf2 = ({ uniqueKey }: { uniqueKey: string }) =>
  new Bench({
    uniqueKey,
    name: 'perf-2',
    metrics: {
      devStart: 'both',
      build: true,
    },
  })

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
  await fsExtra.remove(CASE_TEMP_DIR)
  await fsExtra.copy(CASE_DIR, CASE_TEMP_DIR)
  await fsExtra.copy(viteDistDir, path.resolve(CASE_TEMP_DIR, './vite'))

  await execa('pnpm', ['i'], {
    cwd: CASE_TEMP_DIR,
    stdio: 'inherit',
  })

  await fsExtra.remove(UPLOAD_DIR_TEMP)
  await perf1({ uniqueKey }).run()
  await perf2({ uniqueKey }).run()
}
