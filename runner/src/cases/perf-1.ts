import { Benchmark } from '../Benchmark'

export const benchmark = (sha: string) =>
  new Benchmark({
    sha,
    name: 'perf-1',
    viteCache: './node_modules/.vite',
    dist: './dist',
    metrics: {
      devPrebundle: true,
      build: true,
    },
  })
