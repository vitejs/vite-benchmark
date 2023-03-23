import {
  TAR_DIR as ZIP_DIR,
  REPO_OWNER,
  REPO_NAME,
  MAIN_BRANCH,
} from "./constant"
import { Octokit } from "octokit"
import got from "got"
import colors from "picocolors"
import fsExtra from "fs-extra"
import fs from "node:fs"
import { pipeline } from "node:stream/promises"
import path from "path"
import AdmZip from "adm-zip"
import { runCases } from "./cases"
import { execaCommand } from "execa"

const octokit = new Octokit({})

async function cloneVite(ref: string = `heads/${MAIN_BRANCH}`) {
  const { data: refData } = await octokit.rest.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref,
  })

  const mainSha = refData.object.sha
  const shortName = `vite-${mainSha.slice(0, 8)}`
  const zipPath = path.resolve(ZIP_DIR, `${shortName}.zip`)
  if (!fs.existsSync(zipPath)) {
    const { url: zipUrl } = await octokit.rest.repos.downloadZipballArchive({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: mainSha,
    })
    await fsExtra.ensureDir(ZIP_DIR)
    const zipPath = path.resolve(ZIP_DIR, `vite-${mainSha.slice(0, 8)}.zip`)
    await pipeline(got.stream(zipUrl), fsExtra.createWriteStream(zipPath))
    console.log(colors.green(`Downloaded vitejs/vite@${mainSha}`))
  } else {
    console.log(colors.green(`${mainSha} exists and will be reused.`))
  }

  const zip = new AdmZip(zipPath)
  const entryName = zip.getEntries()[0]?.entryName
  const viteDir = path.resolve(ZIP_DIR, entryName!)
  zip.extractEntryTo(entryName!, ZIP_DIR, true)
  console.log(colors.green(`Vite unziped to ${viteDir}`))
  return viteDir
}

async function main() {
  const viteDir = await cloneVite()
  console.log(colors.cyan(`Start to install dependencies for Vite`))
  await execaCommand(`pnpm i`, {
    cwd: viteDir,
    stdio: "inherit",
  })
  console.log(colors.cyan(`Dependencies install`))
  console.log(colors.cyan(`Start building Vite`))
  await execaCommand(`pnpm build`, {
    cwd: viteDir,
    stdio: "inherit",
  })
  console.log(colors.cyan(`Vite built`))
  const viteBin = path.resolve(viteDir, "packages/vite/bin/vite.js")

  // await execaCommand(`echo 344`, {
  //   stdio: "inherit",
  // })

  runCases({
    viteDir,
  })
}
main()
