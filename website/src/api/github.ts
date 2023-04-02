import { CompareItem } from '../types'

export function composeZipUrl(path: string) {
  return `https://fi3ework.github.io/vite-benchmark/data/${path}/benchmark.zip`
}

function composeCompareItemKey(compare: CompareItem) {
  return encodeURIComponent(`${compare.owner}/${compare.repo}@${compare.sha}`)
}

export function composeCompareZipUrl(
  compareUniqueKey: string,
  compare: CompareItem
): string {
  const res = `https://fi3ework.github.io/vite-benchmark/data/${encodeURIComponent(
    encodeURIComponent(compareUniqueKey)
  )}/${encodeURIComponent(composeCompareItemKey(compare))}.zip`

  return res
}
