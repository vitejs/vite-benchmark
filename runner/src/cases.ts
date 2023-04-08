import { execa } from 'execa'
import fsExtra from 'fs-extra'
import path from 'path'
import colors from 'picocolors'
import { groupBy } from 'lodash-es'
import * as stat from 'simple-statistics'

import { browser, ServeBench } from './ServeBench'
import { CASES_DIR, CASES_TEMP_DIR, UPLOAD_DIR_TEMP } from './constant'
import { Compare, ServeResult, composeCaseTempDir } from './utils'

export async function prepareBenches({
  compares,
  viteDistDirs,
}: {
  compares: Compare[]
  viteDistDirs: string[]
}) {
  console.log(colors.cyan(`Installing dependencies for compares`))
  await fsExtra.remove(UPLOAD_DIR_TEMP)
  await fsExtra.remove(CASES_TEMP_DIR)
  for (const [index, compare] of compares.entries()) {
    const caseTempDir = composeCaseTempDir(compare)
    await fsExtra.copy(CASES_DIR, caseTempDir)
    await fsExtra.copy(
      viteDistDirs[index]!,
      path.resolve(caseTempDir, './vite')
    )

    await execa('pnpm', ['i'], {
      cwd: caseTempDir,
      stdio: 'inherit',
    })
  }
}

export async function runBenches({
  compares,
  repeats,
}: {
  compares: Compare[]
  repeats: number
}) {
  console.log(colors.cyan(`Running benchmarks`))
  const baseCases = [
    {
      id: 'perf-1',
      port: 5173,
      script: 'dev',
      displayName: 'vite 2.7 slow',
      viteCache: './node_modules/.vite',
    },
    {
      id: 'perf-2',
      port: 5173,
      script: 'start:vite',
      displayName: '1000 React components',
      viteCache: './node_modules/.vite',
    } as const,
  ]

  // A(perf1) -> B(perf1) -> A(perf2) -> B(perf2) and repeat for several times
  const totalResults: ServeResult[] = []
  for (let i = 0; i < repeats; i++) {
    console.log(`Running benchmarks for number ${i + 1} time`)
    for (const baseCase of baseCases) {
      for (const compare of compares) {
        const perf = new ServeBench({
          ...baseCase,
          casesDir: composeCaseTempDir(compare),
        })
        const result = await perf.run()
        totalResults.push({
          ...result,
          index: i,
          caseId: baseCase.id,
          displayName: baseCase.displayName,
          uniqueKey: compare.uniqueKey,
        })
      }
    }
  }

  await browser.close()

  const groupedByCase = groupBy(totalResults, (result) => result.caseId)
  Object.keys(groupedByCase).forEach((key) => {
    const groupedByCaseByRef = groupBy(
      groupedByCase[key],
      (result) => result.uniqueKey
    )
    Object.keys(groupedByCaseByRef).forEach((ref) => {
      console.log(colors.cyan(`Results for ${key} with ${ref}`))
      console.table(groupedByCaseByRef[ref])
    })
  })

  const finalResults = []
  for (const compare of compares) {
    for (const { id, displayName } of baseCases) {
      finalResults.push({
        repoRef: decodeURIComponent(compare.uniqueKey),
        caseId: id,
        displayName,
        ...calcAverageOfMetric(totalResults, id, compare.uniqueKey),
      })
    }
  }

  const perfGroups = groupBy(finalResults, (result) => result.caseId)
  Object.keys(perfGroups).forEach((key) => {
    console.log(colors.cyan(`Results for ${key}`))
    console.table(perfGroups[key])
  })

  return perfGroups
}

function calcAverageOfMetric(
  results: ServeResult[],
  caseId: string,
  uniqueKey: string
) {
  const filtered = results.filter(
    (result) => result.caseId === caseId && result.uniqueKey === uniqueKey
  )

  const startups = filtered.map((result) => result.startup)
  const serverStarts = filtered.map((result) => result.serverStart)
  const fcps = filtered.map((result) => result.fcp)

  const startupStat = {
    mean: stat.mean(startups).toFixed(0),
    median: stat.median(startups).toFixed(0),
  }

  const serverStartStat = {
    mean: stat.mean(serverStarts).toFixed(0),
    median: stat.median(serverStarts).toFixed(0),
  }

  const fcpStat = {
    mean: stat.mean(fcps).toFixed(0),
    median: stat.median(fcps).toFixed(0),
  }

  return {
    startupMean: startupStat.mean,
    startupMedian: startupStat.median,
    serverStartMean: serverStartStat.mean,
    serverStartMedian: serverStartStat.median,
    fcpMean: fcpStat.mean,
    fcpMedian: fcpStat.median,
  }
}
