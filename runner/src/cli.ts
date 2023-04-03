import { cac } from 'cac'

import { runBenchmarks } from './cases'
import { VITE_DIR } from './constant'
import { buildVite, cloneVite, composeCompareUrl, parseCompare } from './utils'

const cli = cac()
const isGitHubActions = !!process.env['GITHUB_ACTIONS']

cli
  .command('bench', 'run full benchmark process')
  .option('--compares <compares>', 'vite refs to compare')
  .option('--skip-clone [skipClone]', 'should skip clone vite repositories')
  .option('--temp-dir [tempDir]', 'where to clone vite repositories')
  .option(
    '--vite-dirs [viteDirs]',
    'already cloned Vite projects matched with compares arg'
  )
  .option(
    '--skip-build [skipBuild]',
    'skip build Vite projects matched with compares arg'
  )
  .action(async (options) => {
    const compares = await parseCompare(options.compares)
    let viteTempDirs: string[] = []
    if (!options.skipClone && !options.viteDirs) {
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
      viteTempDirs = options.viteDirs!.split(',')
    }

    if (!options.skipBuild) {
      await Promise.all(
        viteTempDirs.map((path, index) =>
          buildVite({
            viteProjectPath: path,
            uniqueKey: compares[index]!.uniqueKey,
          })
        )
      )
    }

    const viteDistDirs = compares.map(
      (r) => `${VITE_DIR}/${r.uniqueKey}/package`
    )

    for (let i = 0; i < compares.length; i++) {
      const viteDistDir = viteDistDirs[i]!
      await runBenchmarks({
        viteDistDir,
        uniqueKey: compares[i]!.uniqueKey,
      })
    }

    const compareUniqueKey = compares.map((c) => c.uniqueKey).join('...')

    if (isGitHubActions) {
      const core = await import('@actions/core')
      core.setOutput('compare_unique_key', `./data/${compareUniqueKey}`)
      const compareUrl = composeCompareUrl(compares)
      core.summary.addHeading('Benchmark Done')
      core.summary.addLink('View link', compareUrl)
      await core.summary.write()
    }
  })

cli.help()
cli.parse()
