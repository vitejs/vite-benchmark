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
import {
  MAIN_BRANCH,
  PROJECT_DIR,
  REPO_NAME,
  REPO_OWNER,
  UPLOAD_DIR,
  VITE_DIR,
} from './constant'

const octokit = new Octokit({})

async function cloneVite() {
  // https://docs.github.com/en/actions/learn-github-actions/variables
  const runnerTempDir = process.env['RUNNER_TEMP'] || os.tmpdir()

  const tempDir = await fsp.mkdtemp(path.join(runnerTempDir, 'vite'))
  const viteRelativePath = './vite'
  const viteTempDir = path.resolve(tempDir, viteRelativePath)

  if (process.env['CI']) {
    await fsExtra.copy(VITE_DIR, viteTempDir)
    await fsExtra.remove(VITE_DIR)
  } else {
    const { data: refData } = await octokit.rest.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: MAIN_BRANCH,
    })
    const mainSha = refData.object.sha
    const shortName = `vite-${mainSha.slice(0, 8)}`
    const zipPath = path.resolve(tempDir, `./${shortName}.zip`)
    console.log(
      colors.yellow(`Cloning vitejs/vite@${MAIN_BRANCH} into ${zipPath}`)
    )
    const { url: zipUrl } = await octokit.rest.repos.downloadZipballArchive({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: mainSha,
    })
    await pipeline(got.stream(zipUrl), fsExtra.createWriteStream(zipPath))
    console.log(colors.green(`Downloaded vitejs/vite@${mainSha}`))

    const zip = new AdmZip(zipPath)
    const entryName = zip.getEntries()[0]?.entryName
    const viteDirWithRef = path.resolve(tempDir, entryName!)
    zip.extractEntryTo(entryName!, tempDir, true)
    fs.renameSync(viteDirWithRef, path.resolve(tempDir, viteRelativePath))
  }

  console.log(
    colors.cyan(
      `vitejs/vite copied to @${path.resolve(runnerTempDir, viteRelativePath)}`
    )
  )

  return viteTempDir
}

async function main() {
  await $`printenv`

  const viteDir = await cloneVite()
  console.log(colors.cyan(`Vite cloned in ${viteDir}`))
  console.log(colors.cyan(`Start to install dependencies for Vite`))

  console.log(colors.cyan(`Start install dependencies for Vite`))
  const $$ = $({ stdio: 'inherit', cwd: viteDir })

  await $$`node -v`
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

  if (fs.existsSync(VITE_DIR)) {
    fs.rmSync(VITE_DIR, { recursive: true })
  }

  await tar.x({
    file: path.resolve(PROJECT_DIR, tarName),
    cwd: path.resolve(PROJECT_DIR),
  })

  fs.renameSync(
    path.resolve(PROJECT_DIR, './package'),
    path.resolve(PROJECT_DIR, './vite')
  )

  if (fs.existsSync(UPLOAD_DIR)) {
    fs.rmSync(UPLOAD_DIR, { recursive: true })
  }

  await runBenchmarks({
    viteRepo: process.env['BENCHMARK_REPO']!,
    viteRef: process.env['BENCHMARK_REF']!,
    uploadPagesData: process.env['UPLOAD_PAGES_DATA'] === 'true' ? true : false,
    uploadArtifact: process.env['UPLOAD_ARTIFACT'] === 'true' ? true : false,
  })
}

main()
