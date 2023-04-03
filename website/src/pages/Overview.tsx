import type { Suite, CompareItem } from '../types'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface OverviewProps {
  compares: CompareItem[]
  suites: Suite[]
}

function parsePrebundleDebugLog(log: string): number {
  const regex = /bundled in (.+)ms/
  const [, time] = regex.exec(log)!
  return parseFloat(time)
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
  devStartCost: number
}

const columns: ColumnsType<DataType> = [
  {
    title: 'SHA',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Dev Start Cost',
    dataIndex: 'devStartCost',
    key: 'devStartCost',
    render: (text) => <span className="font-mono tabular-nums">{text}ms</span>,
  },
  {
    title: 'Build Cost',
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
  dataKey: Extract<keyof DataType, 'buildCost' | 'devStartCost'>
}) => {
  const diff = data[1][dataKey] - data[0][dataKey]
  const percent = parseFloat(((diff / data[0].devStartCost) * 100).toFixed(3))

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
  const keyMetrics = suites.map((suite) => {
    return {
      start: parsePrebundleDebugLog(suite['dev-start-debug-log.txt'].payload),
      build: parseBuildDebugLog(suite['build-debug-log.txt'].payload),
    }
  })

  const tableData: DataType[] = suites.map((suite, index) => {
    return {
      key: compares[index].sha,
      name: `${compares[index].owner}/${compares[index].repo}@${compares[index].sha}`,
      devStartCost: keyMetrics[index].start,
      buildCost: keyMetrics[index].build,
    }
  })

  return (
    <Table
      className="mx-8"
      bordered
      columns={columns}
      dataSource={tableData}
      pagination={false}
      summary={(data) => {
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}></Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              {<SummaryText data={data} dataKey={'devStartCost'} />}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              {<SummaryText data={data} dataKey={'buildCost'} />}
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )
      }}
    />
  )
}
