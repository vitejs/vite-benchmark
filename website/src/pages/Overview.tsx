import type { Suite, CompareItem } from '../types'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface OverviewProps {
  compares: CompareItem[]
  suites: Suite[]
}

function parseStartDebugLog(log: string): Record<string, number> {
  const readyRegex = /ready in (.+) ms/
  const bundleRegex = /bundled in (.+)ms/
  const [, readyTime] = readyRegex.exec(log)!
  const [, bundleTime] = bundleRegex.exec(log)!
  return { ready: parseFloat(readyTime), bundle: parseFloat(bundleTime) }
}

function parseBuildDebugLog(log: string): number {
  const regex = /built in (.+)s/
  const [, time] = regex.exec(log)!
  return parseFloat(time)
}

interface DataType {
  key: string
  name: string
  buildCost: number
  devColdStartCost: number
  devColdBundleCost: number
  devHotStartCost: number
  devHotBundleCost: number
}

const columns: ColumnsType<DataType> = [
  {
    title: 'SHA',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Dev cold start cost',
    dataIndex: 'devColdStartCost',
    key: 'devColdStartCost',
    render: (text) => <span className="font-mono tabular-nums">{text}ms</span>,
  },
  {
    title: 'Dev cold bundle cost',
    dataIndex: 'devColdBundleCost',
    key: 'devColdStartCost',
    render: (text) => <span className="font-mono tabular-nums">{text}ms</span>,
  },
  {
    title: 'Dev hot start cost',
    dataIndex: 'devHotStartCost',
    key: 'devHotStartCost',
    render: (text) => <span className="font-mono tabular-nums">{text}ms</span>,
  },
  {
    title: 'Dev hot bundle cost',
    dataIndex: 'devHotBundleCost',
    key: 'devHotStartCost',
    render: (text) => <span className="font-mono tabular-nums">{text}ms</span>,
  },
  {
    title: 'Build cost',
    dataIndex: 'buildCost',
    key: 'buildCost',
    render: (text) => <span className="font-mono tabular-nums">{text}s</span>,
  },
]

const SummaryText = ({
  data,
  dataKey,
}: {
  data: readonly DataType[]
  dataKey: Exclude<keyof DataType, 'key' | 'name'>
}) => {
  const diff = data[1][dataKey] - data[0][dataKey]
  const percent = parseFloat(((diff / data[0][dataKey]) * 100).toFixed(3))

  const displayPercent = new Intl.NumberFormat('en-US', {
    signDisplay: 'exceptZero',
  }).format(percent)

  // if diff is less than 3%, consider it as no difference
  if (Math.abs(percent) < 2) {
    return <span className="text-gray-600 font-bold">{displayPercent}%</span>
  }

  const color = diff > 0 ? 'text-red-600' : 'text-green-600'
  return <span className={`${color} font-bold`}>{displayPercent}%</span>
}

export const Overview = ({ suites, compares }: OverviewProps) => {
  const suitesGroups: Record<string, Suite[]> = {}
  for (let index = 0; index < suites.length; index++) {
    const suite = suites[index]
    for (const item of Object.keys(suite)) {
      const [, caseId, rest] = /^perf-(\d+)-(.*)/.exec(suite[item].name)!
      if (!suitesGroups[caseId]) {
        suitesGroups[caseId] = [{}, {}]
      }
      suitesGroups[caseId][index][rest] = suite[item]
    }
  }

  return (
    <>
      {Object.keys(suitesGroups).map((suitesKey, index) => {
        const suites = suitesGroups[suitesKey]
        return (
          <div className="mx-8 my-8">
            <h2 className="mb-2 ml-1 font-mono">perf {suitesKey}</h2>
            <OverviewItem key={index} suites={suites} compares={compares} />
          </div>
        )
      })}
    </>
  )
}

const OverviewItem = ({ suites, compares }: OverviewProps) => {
  const keyMetrics = suites.map((suite) => {
    const { ready: coldReady, bundle: coldBundle } = parseStartDebugLog(
      suite['dev-start-cold-debug-log.txt'].payload
    )

    const { ready: hotReady, bundle: hotBundle } = parseStartDebugLog(
      suite['dev-start-hot-debug-log.txt'].payload
    )

    return {
      coldStart: coldReady,
      coldBundle: coldBundle,
      hotStart: hotReady,
      hotBundle: hotBundle,
      build: parseBuildDebugLog(suite['build-debug-log.txt'].payload),
    }
  })

  const tableData: DataType[] = suites.map((suite, index) => {
    return {
      key: compares[index].sha,
      name: `${compares[index].owner}/${compares[index].repo}@${compares[index].sha}`,
      devColdStartCost: keyMetrics[index].coldStart,
      devColdBundleCost: keyMetrics[index].coldBundle,
      devHotStartCost: keyMetrics[index].hotStart,
      devHotBundleCost: keyMetrics[index].hotBundle,
      buildCost: keyMetrics[index].build,
    }
  })

  return (
    <Table
      bordered
      columns={columns}
      dataSource={tableData}
      pagination={false}
      summary={(data) => {
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}></Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              {<SummaryText data={data} dataKey={'devColdStartCost'} />}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              {<SummaryText data={data} dataKey={'devColdStartCost'} />}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              {<SummaryText data={data} dataKey={'devHotStartCost'} />}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4}>
              {<SummaryText data={data} dataKey={'devHotBundleCost'} />}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5}>
              {<SummaryText data={data} dataKey={'buildCost'} />}
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )
      }}
    />
  )
}
