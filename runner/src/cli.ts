import { cac } from 'cac'

import { prepareBenches, runBenches } from './cases'
import { VITE_DIR } from './constant'
import {
  Compare,
  buildVite,
  cloneVite,
  getPullRequestData,
  parseCompare,
} from './utils'
import path from 'path'

const cli = cac()
const isGitHubActions = !!process.env['GITHUB_ACTIONS']

cli
  .command('bench', 'run full benchmark process')
  .option('--repeats <repeats>', 'number of benchmark repeats')
  .option(
    '--pull-number [pullNumber]',
    'number index of pull request, mutually exclusive with --compares'
  )
  .option(
    '--compares [compares]',
    'vite refs to compare, mutually exclusive with --pull-number'
  )
  .option('--skip-clone [skipClone]', 'should skip clone vite repositories')
  .option(
    '--skip-prepare [skipPrepare]',
    'skip prepare Vite projects matched with compares arg'
  )
  .action(async (options) => {
    let compares: Compare[] = []
    if (options.pullNumber) {
      const { source, target } = await getPullRequestData(options.pullNumber)
      compares = await parseCompare(
        `${target.owner}/${target.repo}@${target.sha},${source.owner}/${source.repo}@${source.sha}`
      )
    } else {
      compares = await parseCompare(options.compares)
    }

    let viteTempDirs: string[] = []
    if (!options.skipClone) {
      viteTempDirs = await Promise.all(
        compares.map((c) =>
          cloneVite({
            owner: c.owner,
            repo: c.repo,
            sha: c.sha,
          })
        )
      )
    } else {
      viteTempDirs = compares.map((c) =>
        path.resolve(VITE_DIR, c.uniqueKey, 'package')
      )
    }

    const viteDistDirs = compares.map(
      (r) => `${VITE_DIR}/${r.uniqueKey}/package`
    )

    if (!options.skipPrepare) {
      await Promise.all(
        viteTempDirs.map((path, index) =>
          buildVite({
            viteProjectPath: path,
            uniqueKey: compares[index]!.uniqueKey,
          })
        )
      )

      await prepareBenches({ compares, viteDistDirs })
    }

    const benches = await runBenches({
      compares,
      repeats: options.repeats,
    })

    if (isGitHubActions) {
      const core = await import('@actions/core')
      const isPull = !!options.pullNumber
      const repoLink = 'https://github.com/fi3ework/vite-benchmark/tree/main'
      if (isPull) {
        core.summary
          .addRaw(
            options.pullNumber
              ? `# Benchmark for pull request [#${options.pullNumber}](https://github.com/vitejs/vite/pull/${options.pullNumber})`
              : `# Benchmark for ${compares.map((c) => c.uniqueKey).join(', ')}`
          )
          .addHeading('Meta Info', 2)
          .addTable(
            [
              isPull && [
                'pull request link',
                `vitejs/vite#${options.pullNumber}`,
              ],
              ...compares.map((c, index) => [
                `SHA of compare ${index}`,
                `${c.owner}/${c.repo}@${c.sha.slice(0, 7)}`,
              ]),
              ['repetition', `${options.repeats}`],
            ].filter(Boolean)
          )
          .addHeading('Benchmark Result', 2)

        Object.entries(benches).forEach(([_key, bench], idx) => {
          function formatPercent(from: number | string, to: number | string) {
            from = +from
            to = +to
            const diff = to - from
            if (diff === 0)
              return '-'
            const emoji = diff > 0 ? '🔺' : '⚡️'
            const percent = from === 0  ? '-' : ` (${((diff / from) * 100).toFixed(2)}%)`
            return diff + percent + ' ' + emoji
          }

          const firstBench = bench[0]!
          core.summary.addHeading(`Case ${idx + 1}: [${firstBench.displayName}](${repoLink}/cases/${firstBench.caseId})`, 3)
          core.summary.addTable([
            [
              { data: 'ref', header: true },
              { data: 'start up mean', header: true },
              { data: 'start up median', header: true },
              { data: 'server start mean', header: true },
              { data: 'server start median', header: true },
              { data: 'fcp mean', header: true },
              { data: 'fcp median', header: true },
            ],
            ...bench.map((b) => [
              b.repoRef,
              b.startupMean,
              b.startupMedian,
              b.serverStartMean,
              b.serverStartMedian,
              b.fcpMean,
              b.fcpMedian,
            ]),
          ])

          core.summary.addTable([
            [
              { data: 'ref', header: true },
              { data: 'start up mean', header: true },
              { data: 'start up median', header: true },
              { data: 'server start mean', header: true },
              { data: 'server start median', header: true },
              { data: 'fcp mean', header: true },
              { data: 'fcp median', header: true },
            ],
            ...bench.map((b) => [
              b.repoRef,
              formatPercent(firstBench.startupMean, b.startupMean),
              formatPercent(firstBench.startupMedian, b.startupMedian),
              formatPercent(firstBench.serverStartMean, b.serverStartMean),
              formatPercent(firstBench.serverStartMedian, b.serverStartMedian),
              formatPercent(firstBench.fcpMean, b.fcpMean),
              formatPercent(firstBench.fcpMedian, b.fcpMedian),
            ]),
          ])
        })
      }

      core.setOutput('summary', core.summary.stringify())
      await core.summary.write()
    }
  })

cli.help()
cli.parse()
