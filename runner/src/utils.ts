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

import { CASES_TEMP_DIR, VITE_DIR } from './constant'

const octokit = new Octokit({})

export interface Compare {
  owner: string
  repo: string
  sha: string
  ref: string | null
  uniqueKey: string
}

export interface ServeResult {
  index: number
  caseId: string
  uniqueKey: string
  startup: number
  serverStart: number
  fcp: number
}

export async function parseCompare(compare: string): Promise<Compare[]> {
  const repoPromises = compare
    .split(',')
    .map((repo) => repo.trim())
    .map(async (r) => {
      const regex = /([^/]+)\/([^@]+)@(.+)/
      if (!regex.test(r)) {
        throw new Error(`Invalid compare format: ${r}`)
      } else {
        const [, owner, repo, ref] = regex.exec(r)!
        let finalSha = ref!
        let finalRef: string | null = ref!
        if (ref?.startsWith('heads/') || ref?.startsWith('tags/')) {
          const { data: refData } = await octokit.rest.git.getRef({
            owner: owner!,
            repo: repo!,
            ref: ref!,
          })

          finalSha = refData.object.sha
        } else {
          finalRef = null
        }

        const uniqueKey = encodeURIComponent(
          `${owner}/${repo}@${finalSha!.slice(0, 7)}`
        )

        return {
          owner: owner!,
          repo: repo!,
          ref: finalRef,
          sha: finalSha,
          uniqueKey,
        }
      }
    })

  return await Promise.all(repoPromises)
}

const RUNNER_TEMP = process.env['RUNNER_TEMP'] || os.tmpdir()

export async function cloneVite({
  owner,
  repo,
  sha,
}: {
  owner: string
  repo: string
  sha: string
}) {
  // https://docs.github.com/en/actions/learn-github-actions/variables
  const viteRelativePath = './vite'
  const tempDir = await fsp.mkdtemp(path.join(RUNNER_TEMP, viteRelativePath))
  const viteTempDir = path.resolve(tempDir, viteRelativePath)
  const shortName = `vite-${sha.slice(0, 8)}`
  const zipPath = path.resolve(tempDir, `./${shortName}.zip`)
  console.log(colors.yellow(`Cloning ${owner}/${repo}@${sha} into ${zipPath}`))
  const { url: zipUrl } = await octokit.rest.repos.downloadZipballArchive({
    owner: owner,
    repo: repo,
    ref: sha,
  })
  await pipeline(got.stream(zipUrl), fsExtra.createWriteStream(zipPath))
  console.log(colors.green(`Downloaded ${owner}/${repo}@${sha}`))

  const zip = new AdmZip(zipPath)
  const entryName = zip.getEntries()[0]?.entryName
  const viteDirWithRef = path.resolve(tempDir, entryName!)
  zip.extractEntryTo(entryName!, tempDir, true)
  fs.renameSync(viteDirWithRef, viteTempDir)

  console.log(colors.cyan(`${owner}/${repo}@${sha} in ${viteTempDir}`))
  return viteTempDir
}

export async function buildVite({
  viteProjectPath,
  uniqueKey,
}: {
  viteProjectPath: string
  uniqueKey: string
}) {
  const $$ = $({ stdio: 'inherit', cwd: viteProjectPath })
  await $$`node -v`
  await $$`pnpm i`

  console.log(colors.cyan(`Start run 'pnpm build' for Vite`))
  await $$`pnpm build`

  console.log(colors.cyan(`Start run 'pnpm pack' for Vite`))
  await execa('pnpm', ['pack'], {
    stdio: 'inherit',
    cwd: path.resolve(viteProjectPath, 'packages/vite'),
  })

  console.log(colors.cyan(`Start copy vite tarball to <project>/vite`))
  const tarName = (
    await fsp.readdir(path.resolve(viteProjectPath, 'packages/vite'))
  ).find((name) => name.endsWith('.tgz'))

  if (!tarName) {
    throw new Error(`Can't find tarball for Vite`)
  }

  const uniquePath = path.resolve(VITE_DIR, uniqueKey)
  fsExtra.ensureDirSync(uniquePath)
  const tarPath = path.resolve(uniquePath, tarName)

  await fsp.copyFile(
    path.resolve(viteProjectPath, 'packages/vite', tarName),
    tarPath
  )

  await tar.x({
    file: tarPath,
    cwd: uniquePath,
  })

  const viteDistDir = path.resolve(uniquePath, 'package')
  return viteDistDir
}

export function composeCompareUrl(compares: Compare[]): string {
  // ex. https://fi3ework.github.io/vite-benchmark/compare/?compares=vitejs%2Fvite%401f011d8...vitejs%2Fvite%40c268cfa
  const base = 'https://fi3ework.github.io/vite-benchmark/compare'
  const compareQuery = compares.map((c) => c.uniqueKey).join('...')

  return `${base}/?compares=${compareQuery}`
}

export function composeCaseTempDir(compare: Compare): string {
  return path.resolve(
    CASES_TEMP_DIR,
    `${compare.owner}___${compare.repo}___${compare.sha.slice(0, 7)}`
  )
}

export function summarizeResult(result: ServeResult): string {
  return ''
}
