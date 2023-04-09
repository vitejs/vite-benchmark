import { execa } from 'execa'
import fsExtra from 'fs-extra'
import { groupBy } from 'lodash-es'
import path from 'path'
import colors from 'picocolors'
import * as stat from 'simple-statistics'
import kMeans from 'skmeans'

import core from '@actions/core'

import { CASES_DIR, CASES_TEMP_DIR, UPLOAD_DIR_TEMP } from './constant'
import { browser, ServeBench } from './ServeBench'
import {
  composeCaseTempDir,
  type Compare,
  type BaseCase,
  type ServeResult,
} from './utils'

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
  const baseCases: BaseCase[] = [
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
    },
  ]

  // interleaving running cases could reduce the variance
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
  logGroupResultByCase(totalResults)
  return composeSummarized(totalResults, compares, baseCases)
}

export function logGroupResultByCase(results: ServeResult[]) {
  const groupedByCase = groupBy(results, (result) => result.caseId)
  Object.keys(groupedByCase).forEach((key) => {
    const groupedByCaseByRef = groupBy(groupedByCase[key], (result) =>
      decodeURIComponent(result.uniqueKey)
    )
    Object.keys(groupedByCaseByRef).forEach((ref) => {
      console.log(colors.cyan(`Results for ${key} with ${ref}`))
      console.table(groupedByCaseByRef[ref])
    })
  })
}

type MetricKey = 'startupStat' | 'serverStartStat' | 'fcpStat'
interface MetricStat {
  mean: string
  median: string
  kmeans: string
}
type MetricStatMap = Record<MetricKey, MetricStat>

interface SummarizedResult {
  repoRef: string
  caseId: string
  displayName: string
  metrics: MetricStatMap
}

export function composeSummarized(
  results: ServeResult[],
  compares: Compare[],
  baseCases: BaseCase[]
): Record<string, SummarizedResult[]> {
  const groupedResults: SummarizedResult[] = []
  for (const compare of compares) {
    for (const { id, displayName } of baseCases) {
      groupedResults.push({
        repoRef: decodeURIComponent(compare.uniqueKey),
        caseId: id,
        displayName,
        metrics: calcMetrics(results, id, compare.uniqueKey),
      })
    }
  }

  return groupBy(groupedResults, (result) => result.caseId)
}

export function calcMetrics(
  results: ServeResult[],
  caseId: string,
  uniqueKey: string
): Record<MetricKey, MetricStat> {
  const filtered = results.filter(
    (result) => result.caseId === caseId && result.uniqueKey === uniqueKey
  )

  const calcMetric = (metric: keyof ServeResult) => {
    const values = filtered.map((result) => result[metric]) as number[]
    return {
      mean: stat.mean(values).toFixed(0),
      median: stat.median(values).toFixed(0),
      kmeans: calcKmeans(values).toFixed(0),
    }
  }

  const startupStat = calcMetric('startup')
  const serverStartStat = calcMetric('serverStart')
  const fcpStat = calcMetric('fcp')

  return {
    startupStat,
    serverStartStat,
    fcpStat,
  }
}

const calcKmeans = (values: number[]) => {
  let kMeansSum = 0
  let kMeansIter = 0

  // run k-means 100000 times to reduce the variance
  for (let i = 0; i < 100000; i++) {
    // set cluster count to 3 as we want the median cluster form the one-dimensional data
    const CLUSTER_COUNT = 3
    const { centroids, idxs } = kMeans(values, CLUSTER_COUNT, 'kmpp')
    const medianClusterIndex = centroids.indexOf(stat.median(centroids))
    const medianClusterCount = idxs.filter(
      (c) => c === medianClusterIndex
    ).length

    const LEAST_ELEMENT_COUNT = Math.floor(values.length / 3)
    if (medianClusterCount >= LEAST_ELEMENT_COUNT) {
      kMeansSum += centroids[medianClusterIndex]!
      kMeansIter++
    }
  }

  return kMeansSum / kMeansIter
}

export function composeGitHubActionsSummary({
  options,
  compares,
  summarizedResult,
}: {
  compares: Compare[]
  options: any
  summarizedResult: Record<string, SummarizedResult[]>
}) {
  const isPull = !!options.pullNumber
  core.summary
    .addRaw(
      options.pullNumber
        ? `# Benchmark for pull request [#${options.pullNumber}](https://github.com/vitejs/vite/pull/${options.pullNumber})`
        : `# Benchmark for ${compares.map((c) => c.uniqueKey).join(', ')}`
    )
    .addHeading('Meta Info', 2)
    .addTable(
      [
        isPull && ['pull request link', `vitejs/vite#${options.pullNumber}`],
        ...compares.map((c, index) => [
          `SHA of compare ${index}`,
          `${c.owner}/${c.repo}@${c.sha.slice(0, 7)}`,
        ]),
        ['repetition', `${options.repeats}`],
      ].filter(Boolean) as string[][]
    )
    .addHeading('Benchmark Result', 2)

  const formatPercent = (from: number | string, to: number | string) => {
    from = +from
    to = +to
    const diff = to - from
    if (diff === 0) return '-'
    const diffPercent = from === 0 ? 0 : diff / from
    const emoji =
      Math.abs(diffPercent) < 0.0003 // ignore insignificant diff
        ? ''
        : diffPercent > 0
        ? ' 🔺'
        : ' ⚡️'
    const percent =
      from === 0
        ? '-'
        : ` (${diffPercent > 0 ? '+' : ''}${(diffPercent * 100).toFixed(2)}%)`
    return diff + percent + emoji
  }

  const repoLink = 'https://github.com/vitejs/vite-benchmark/tree/main'
  Object.entries(summarizedResult).forEach(([_key, bench], idx) => {
    const firstBench = bench[0]!
    core.summary.addHeading(
      `Case ${idx + 1}: <a href="${repoLink}/cases/${firstBench.caseId}">${
        firstBench.displayName
      }</a>`,
      3
    )

    core.summary.addRaw('<details><summary>Details</summary>')
    core.summary.addTable([
      [
        { data: 'ref', header: true },
        { data: 'start up mean', header: true },
        { data: 'start up median', header: true },
        { data: 'start up k-means', header: true },
        { data: 'server start mean', header: true },
        { data: 'server start median', header: true },
        { data: 'server start k-means', header: true },
        { data: 'fcp mean', header: true },
        { data: 'fcp median', header: true },
        { data: 'fcp k-means', header: true },
      ],
      ...bench.map((b) => [
        b.repoRef,
        b.metrics.startupStat.mean,
        b.metrics.startupStat.median,
        b.metrics.startupStat.kmeans,
        b.metrics.serverStartStat.mean,
        b.metrics.serverStartStat.median,
        b.metrics.serverStartStat.kmeans,
        b.metrics.fcpStat.mean,
        b.metrics.fcpStat.median,
        b.metrics.fcpStat.kmeans,
      ]),
    ])
    core.summary.addRaw('</details>')

    core.summary.addTable([
      [
        { data: 'ref', header: true },
        { data: 'start', header: true },
        { data: 'server', header: true },
        { data: 'fcp', header: true },
      ],
      ...bench.map((b) => [
        b.repoRef,
        formatPercent(
          firstBench.metrics.startupStat.kmeans,
          b.metrics.startupStat.kmeans
        ),
        formatPercent(
          firstBench.metrics.serverStartStat.kmeans,
          b.metrics.serverStartStat.kmeans
        ),
        formatPercent(
          firstBench.metrics.fcpStat.kmeans,
          b.metrics.fcpStat.kmeans
        ),
      ]),
    ])
  })

  return core.summary.stringify()
}
