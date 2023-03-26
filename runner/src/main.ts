import AdmZip from 'adm-zip'
import { $, execa } from 'execa'
import fsExtra from 'fs-extra'
import got from 'got'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Octokit } from 'octokit'
import colors from 'picocolors'
import tar from 'tar'

import { runBenchmarks } from './cases'
import { MAIN_BRANCH, PROJECT_DIR, REPO_NAME, REPO_OWNER } from './constant'

const octokit = new Octokit({})

async function cloneVite(ref: string = `heads/${MAIN_BRANCH}`) {
  // https://docs.github.com/en/actions/learn-github-actions/variables
  const runnerTempDir = process.env['RUNNER_TEMP'] || os.tmpdir()
  const viteTempDir = await fsp.mkdtemp(path.join(runnerTempDir, 'vite'))
  const { data: refData } = await octokit.rest.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref,
  })

  const mainSha = refData.object.sha
  const shortName = `vite-${mainSha.slice(0, 8)}`
  const zipPath = path.resolve(viteTempDir, `./${shortName}.zip`)
  if (!fs.existsSync(zipPath)) {
    console.log(colors.yellow(`Cloning vitejs/vite@${ref} into ${zipPath}`))
    const { url: zipUrl } = await octokit.rest.repos.downloadZipballArchive({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: mainSha,
    })
    await pipeline(got.stream(zipUrl), fsExtra.createWriteStream(zipPath))
    console.log(colors.green(`Downloaded vitejs/vite@${mainSha}`))
  } else {
    console.log(colors.green(`${mainSha} exists and will be reused.`))
  }

  const zip = new AdmZip(zipPath)
  const entryName = zip.getEntries()[0]?.entryName
  let viteDir = path.resolve(viteTempDir, entryName!)
  zip.extractEntryTo(entryName!, viteTempDir, true)

  const viteRelativePath = './vite'
  fs.renameSync(viteDir, path.resolve(viteTempDir, viteRelativePath))
  viteDir = path.resolve(viteTempDir, 'vite')

  const vitePath = path.resolve(viteTempDir, viteRelativePath)
  return vitePath
}

async function main() {
  const viteDir = await cloneVite()
  console.log(colors.cyan(`Vite cloned in ${viteDir}`))
  console.log(colors.cyan(`Start to install dependencies for Vite`))

  console.log(colors.cyan(`Start install dependencies for Vite`))
  const $$ = $({ stdio: 'inherit', cwd: viteDir })

  await $$`corepack enable`
  await $$`pnpm i`

  console.log(colors.cyan(`Start run 'pnpm build' for Vite`))
  await $$`pnpm build`

  console.log(colors.cyan(`Start run 'pnpm pack' for Vite`))
  await execa('pnpm', ['pack'], {
    stdio: 'inherit',
    cwd: path.resolve(viteDir, 'packages/vite'),
  })

  console.log(colors.cyan(`Start copy vite tarball to <project>/vite`))
  const tarName = (
    await fsp.readdir(path.resolve(viteDir, 'packages/vite'))
  ).find((name) => name.endsWith('.tgz'))
  if (!tarName) {
    throw new Error(`Can't find tarball for Vite`)
  }
  await fsp.copyFile(
    path.resolve(viteDir, 'packages/vite', tarName),
    path.resolve(PROJECT_DIR, tarName)
  )

  if (fs.existsSync(path.resolve(PROJECT_DIR, './vite'))) {
    fs.rmSync(path.resolve(PROJECT_DIR, './vite'), { recursive: true })
  }

  await tar.x({
    file: path.resolve(PROJECT_DIR, tarName),
    cwd: path.resolve(PROJECT_DIR),
  })

  fs.renameSync(
    path.resolve(PROJECT_DIR, './package'),
    path.resolve(PROJECT_DIR, './vite')
  )

  const viteBin = path.resolve(PROJECT_DIR, 'vite/bin/vite.js')

  await runBenchmarks({
    viteBin,
  })
}
main()
