import { cac } from 'cac'
import path from 'path'
import colors from 'picocolors'

import core from '@actions/core'

import {
  composeGitHubActionsSummary,
  prepareBenches,
  runBenches,
} from './cases'
import { VITE_DIR } from './constant'
import {
  buildVite,
  cloneVite,
  type Compare,
  getPullRequestData,
  parseCompare,
  GITHUB_ACTIONS,
  actionsCache,
} from './utils'

const cli = cac()

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

    const { restoreCache, saveCache, cachePaths, cacheKey } =
      actionsCache(compares)
    let hasActionsCache = false
    if (GITHUB_ACTIONS) {
      const key = await restoreCache()
      console.log(colors.cyan(`Actions cache key: ${key}`))
      hasActionsCache = !!key
    }

    let viteTempDirs: string[] = []
    let cleanTempDirs: (() => Promise<void>)[] = []
    if (!(options.skipClone || hasActionsCache)) {
      const dirs = await Promise.all(
        compares.map((c) =>
          cloneVite({
            owner: c.owner,
            repo: c.repo,
            sha: c.sha,
          })
        )
      )
      viteTempDirs = dirs.map((d) => d.viteTempDir)
      cleanTempDirs = dirs.map((d) => d.cleanTempDir)
    } else {
      viteTempDirs = compares.map((c) =>
        path.resolve(VITE_DIR, c.uniqueKey, 'package')
      )
    }

    const viteDistDirs = compares.map(
      (r) => `${VITE_DIR}/${r.uniqueKey}/package`
    )

    if (!(options.skipPrepare || hasActionsCache)) {
      await Promise.all(
        viteTempDirs.map((path, index) =>
          buildVite({
            viteProjectPath: path,
            uniqueKey: compares[index]!.uniqueKey,
          })
        )
      )

      if (GITHUB_ACTIONS) {
        await saveCache()
        console.log(
          colors.cyan(
            `Actions cache saved of paths ${cachePaths.join(
              ', '
            )}, cache key: "${cacheKey}"`
          )
        )
      }

      await Promise.all(cleanTempDirs.map((fn) => fn()))
      await prepareBenches({ compares, viteDistDirs })
    }

    const summarizedResult = await runBenches({
      compares,
      repeats: options.repeats,
    })

    Object.keys(summarizedResult).forEach((key) => {
      console.log(colors.cyan(`Summarized for ${key}`))
      const toLog = summarizedResult[key]!.map((item) => {
        const { metrics, ...withoutMetrics } = item
        return {
          ...withoutMetrics,
          startup: JSON.stringify(metrics.startupStat),
          serverStart: JSON.stringify(metrics.serverStartStat),
          fcp: JSON.stringify(metrics.fcpStat),
        }
      })
      console.table(toLog)
    })

    const summaryStr = composeGitHubActionsSummary({
      options,
      compares,
      summarizedResult,
    })

    core.setOutput('summary', summaryStr)

    if (GITHUB_ACTIONS) {
      await core.summary.write()
    }
  })

cli.help()
cli.parse()
