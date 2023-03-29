import { benchmark as genPerf1 } from './cases/perf-1'

export async function runBenchmarks({
  viteRef,
}: {
  viteRepo: string
  viteRef: string
  uploadPagesData: boolean
  uploadRelease: boolean
}) {
  await genPerf1(viteRef).run()
}
