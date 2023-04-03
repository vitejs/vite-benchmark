import { Button, Select, Spin } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { setOptions, unzip } from 'unzipit'

import { composeCompareZipUrl } from '../api/github'
import { Overview } from './Overview'

import type { Suite, CompareItem, SuiteKeys } from '../types'

const worker = new URL('unzipit/dist/unzipit-worker.module.js', import.meta.url)

setOptions({
  useWorkers: true,
  workerURL: worker.href,
  numWorkers: 2,
})

const parseCompares = (compares: string) => {
  const items = compares.split('...')
  return items.map((item) => {
    const regex = /([^/]+)\/([^@]+)@(.+)/
    const [, owner, repo, sha] = regex.exec(item)!
    return { owner, repo, sha }
  })
}

export const ComparePage = () => {
  const [suites, setSuites] = useState<Suite[]>()
  const [currSuiteKey, setSuiteKey] = useState<SuiteKeys>()
  const [compareIndex, setCompareIndex] = useState<number>()
  const [compares, setCompares] = useState<CompareItem[]>()
  let [searchParams] = useSearchParams()

  const fetchZip = useCallback(async (url: string) => {
    return unzipArtifact(url)
  }, [])

  useEffect(() => {
    const fn = async () => {
      const compareUniqueKey = searchParams.get('compares')!
      const compares = parseCompares(compareUniqueKey)
      setCompares(compares)
      const res = await Promise.all(
        compares.map((compare) => {
          return fetchZip(composeCompareZipUrl(compareUniqueKey, compare))
        })
      )

      setSuites(res)
    }

    fn()
  }, [])

  const handleChange = (value: SuiteKeys) => {
    setSuiteKey(value)
  }

  const handleCompareIndex = (value: number) => {
    setCompareIndex(value)
  }

  const showOverView = () => {
    setCompareIndex(undefined)
    setSuiteKey(undefined)
  }

  if (!suites || !compares) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="font-mono text-3xl">
          <Spin className="pr-6" size="large" />
          Preparing benchmark data 👻
        </div>
      </div>
    )
  }

  const currSuite = compareIndex !== undefined ? suites?.[compareIndex] : null
  const currPayload =
    compareIndex !== undefined && currSuiteKey !== undefined
      ? suites?.[compareIndex]?.[currSuiteKey]
      : null

  const showOverview = !currPayload

  return (
    <div>
      <div className="ml-8 mt-8 mb-4 space-x-2">
        <Button type="default" onClick={showOverView}>
          Overview
        </Button>
        <Select
          value={compareIndex}
          allowClear
          placeholder="Select a sha"
          style={{ width: 200 }}
          onChange={handleCompareIndex}
          options={(compares || []).map((c, index) => {
            return {
              label: (
                <span className="font-mono">
                  {c.sha}({index === 0 ? 'base' : 'to'})
                </span>
              ),
              value: index,
            }
          })}
        />
        {currSuite && (
          <Select
            value={currSuiteKey}
            allowClear
            placeholder="Select a suite"
            style={{ width: 500 }}
            onChange={handleChange}
            options={Object.keys(currSuite).map((name) => ({
              label: <span className="font-mono">{name}</span>,
              value: name,
            }))}
          />
        )}
      </div>
      {showOverview ? (
        <Overview compares={compares} suites={suites!} />
      ) : (
        <>
          {currPayload?.type === 'cpuprofile' && (
            <iframe
              frameBorder={0}
              key={currPayload.payload}
              style={{ width: '100vw', height: 'calc(100vh - 100px)' }}
              src={`/vite-benchmark/speedscope/index.html#profileURL=${encodeURIComponent(
                currPayload.payload
              )}&title=${currPayload.name}`}
            />
          )}
          {currPayload?.type === 'txt' && (
            <pre className="m-8 p-3 text-xs border rounded-md border-green-400 bg-black">
              <code>{currPayload.payload}</code>
            </pre>
          )}
        </>
      )}
    </div>
  )
}

const unzipArtifact = async (url: string) => {
  const { entries } = await unzip(url)
  const result: Partial<Suite> = {}
  const pms = Object.entries(entries).map(async ([name, entry]) => {
    if (name.endsWith('.txt')) {
      const text = await entry.text()
      // @ts-ignore
      result[name] = {
        name,
        type: 'txt',
        payload: text,
      }
    }

    if (name.endsWith('.cpuprofile')) {
      const blob = await entry.blob('application/json')
      const ObjectUrl = window.URL.createObjectURL(blob)
      // @ts-ignore
      result[name] = {
        name,
        type: 'cpuprofile',
        payload: ObjectUrl,
      }
    }
  })

  await Promise.all(pms)
  return result as Suite
}
