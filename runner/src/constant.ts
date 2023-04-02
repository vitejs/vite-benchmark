import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const REPO_OWNER = 'vitejs'
export const REPO_NAME = 'vite'
export const MAIN_BRANCH = 'main'
export const PROJECT_DIR = path.resolve(__dirname, '../..')
export const CASE_DIR = path.resolve(PROJECT_DIR, './cases')
export const CASE_TEMP_DIR = path.resolve(PROJECT_DIR, './cases-temp')
export const UPLOAD_DIR = path.resolve(PROJECT_DIR, './upload')
export const UPLOAD_DIR_TEMP = path.resolve(PROJECT_DIR, './upload-temp')
export const VITE_DIR = path.resolve(PROJECT_DIR, './vite')
