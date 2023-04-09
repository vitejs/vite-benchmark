import { describe, expect, test } from 'vitest'
import {
  composeGitHubActionsSummary,
  calcMetrics,
  composeSummarized,
} from '../src/cases'

describe('data report', () => {
  test('composeSummarized', () => {
    const v = composeSummarized(results, compares, baseCases)
    Object.keys(v).forEach((key) => {
      v[key]!.forEach((item) => {
        item.metrics.fcpStat.kmeans = '-'
        item.metrics.serverStartStat.kmeans = '-'
        item.metrics.startupStat.kmeans = '-'
      })
    })
    expect(v).matchSnapshot()
  })

  test('calcMetrics', () => {
    const v = calcMetrics(results, 'perf-1', 'vitejs%2Fvite%40063d93b')
    v.fcpStat.kmeans = '-'
    v.serverStartStat.kmeans = '-'
    v.startupStat.kmeans = '-'
    expect(v).toMatchSnapshot()
  })

  test('composeGitHubActionsSummary', () => {
    let v = composeGitHubActionsSummary({
      options: {
        pullNumber: 12787,
      },
      compares,
      summarizedResult: composeSummarized(results, compares, baseCases),
    })

    v = v.replaceAll(/<td>.*<\/td>/g, '<td>-</td>')
    expect(v).matchSnapshot()
  })
})

const results = [
  {
    startup: 2761,
    serverStart: 457,
    fcp: 1632.9000000953674,
    index: 0,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2632,
    serverStart: 462.19,
    fcp: 1491.5,
    index: 0,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2644,
    serverStart: 189,
    fcp: 2069.5,
    index: 0,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2642,
    serverStart: 197.97,
    fcp: 2058.100000143051,
    index: 0,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2000,
    serverStart: 168,
    fcp: 1531,
    index: 1,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 1956,
    serverStart: 153.41,
    fcp: 1565.2999999523163,
    index: 1,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2671,
    serverStart: 203,
    fcp: 2201.5999999046326,
    index: 1,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2644,
    serverStart: 214.28,
    fcp: 2150.300000190735,
    index: 1,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2038,
    serverStart: 163,
    fcp: 1634.3000001907349,
    index: 2,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 1957,
    serverStart: 165.6,
    fcp: 1545.9000000953674,
    index: 2,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2584,
    serverStart: 212,
    fcp: 2088.5999999046326,
    index: 2,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2515,
    serverStart: 201.99,
    fcp: 2045.5,
    index: 2,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 1990,
    serverStart: 166,
    fcp: 1578.3999998569489,
    index: 3,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 1915,
    serverStart: 156.98,
    fcp: 1495.7999999523163,
    index: 3,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2484,
    serverStart: 199,
    fcp: 2026.7000000476837,
    index: 3,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2575,
    serverStart: 199.65,
    fcp: 2101.5999999046326,
    index: 3,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 1991,
    serverStart: 163,
    fcp: 1573.5,
    index: 4,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 1932,
    serverStart: 156.37,
    fcp: 1510,
    index: 4,
    caseId: 'perf-1',
    displayName: 'vite 2.7 slow',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
  {
    startup: 2600,
    serverStart: 209,
    fcp: 2117.199999809265,
    index: 4,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    startup: 2583,
    serverStart: 202.18,
    fcp: 2106.2999999523163,
    index: 4,
    caseId: 'perf-2',
    displayName: '1000 React components',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
]

const compares = [
  {
    owner: 'vitejs',
    repo: 'vite',
    ref: null,
    sha: '063d93bf5ed487bf89b74526d838711ed5e125eb',
    uniqueKey: 'vitejs%2Fvite%40063d93b',
  },
  {
    owner: 'sun0day',
    repo: 'vite',
    ref: null,
    sha: '999ad63afc4271aa37a960fba9d0aef4132efe61',
    uniqueKey: 'sun0day%2Fvite%40999ad63',
  },
]

const baseCases = [
  {
    id: 'perf-1',
    port: 5173,
    script: 'dev',
    displayName: 'vite 2.7 slow',
    viteCache: './node_modules/.vite',
  },
  {
    id: 'perf-2',
    port: 5173,
    script: 'start:vite',
    displayName: '1000 React components',
    viteCache: './node_modules/.vite',
  },
]
