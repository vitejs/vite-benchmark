import { cac } from 'cac'

import { prepareBenches, runBenches } from './cases'
import { VITE_DIR } from './constant'
import { buildVite, cloneVite, parseCompare } from './utils'
import path from 'path'

const cli = cac()
const isGitHubActions = !!process.env['GITHUB_ACTIONS']

cli
  .command('bench', 'run full benchmark process')
  .option('--compares <compares>', 'vite refs to compare')
  .option('--skip-clone [skipClone]', 'should skip clone vite repositories')
  .option('--repeats [repeats]', 'number of benchmark repeats')
  .option(
    '--skip-prepare [skipPrepare]',
    'skip prepare Vite projects matched with compares arg'
  )
  .action(async (options) => {
    const compares = await parseCompare(options.compares)
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

    await runBenches({
      compares,
      repeats: options.repeats,
    })

    if (isGitHubActions) {
      // const core = await import('@actions/core')
      // core.setOutput('compare_unique_key', `./data/${compareUniqueKey}`)
      // const compareUrl = composeCompareUrl(compares)
      // core.summary.addHeading('Benchmark Done')
      // core.summary.addLink('View link', compareUrl)
      // await core.summary.write()
    }
  })

cli.help()
cli.parse()
