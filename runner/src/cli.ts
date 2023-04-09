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
} from './utils'

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

    if (isGitHubActions) {
      await core.summary.write()
    }
  })

cli.help()
cli.parse()
