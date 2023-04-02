import { cac } from 'cac'

import { buildVite, cloneVite, parseCompare } from './utils'
import { VITE_DIR } from './constant'
import { runBenchmarks } from './cases'

const cli = cac()

cli
  .command('bench', 'run full benchmark process')
  .option('--compares <compares>', 'vite refs to compare')
  .option('--clone', 'should clone vite repositories')
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
    const repos = await parseCompare(options.compares)
    let viteTempDirs: string[] = []
    if (options.clone && !options.viteDirs) {
      viteTempDirs = await Promise.all(
        repos.map((r) =>
          cloneVite({
            owner: r.owner,
            repo: r.repo,
            sha: r.sha,
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
            uniqueKey: repos[index]!.uniqueKey,
          })
        )
      )
    }

    const viteDistDirs = repos.map((r) => `${VITE_DIR}/${r.uniqueKey}/package`)

    for (let i = 0; i < repos.length - 1; i++) {
      const viteDistDir = viteDistDirs[i]!
      await runBenchmarks({
        viteDistDir,
        uniqueKey: repos[i]!.uniqueKey,
      })
    }

    const compareUniqueKey = repos.map((r) => r.uniqueKey).join('...')
  })

cli.help()
cli.parse()
