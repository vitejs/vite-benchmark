import { Benchmark } from '../Benchmark'

export const benchmark = ({ uniqueKey }: { uniqueKey: string }) =>
  new Benchmark({
    uniqueKey,
    name: 'perf-1',
    dist: './dist',
    metrics: {
      devPrebundle: true,
      build: true,
    },
  })
