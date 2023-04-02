import { Select, Space, Spin } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { setOptions, unzip } from 'unzipit'

import { CompareItem, composeCompareZipUrl } from '../api/github'

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
  const [profiles, setProfiles] = useState<Profiles[]>()
  const [currProfileKey, setCurrProfileKey] = useState<string>()
  const [shaIndex, setCompareIndex] = useState<number>(0)
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

      setProfiles(res)
    }

    fn()
  }, [])

  const handleChange = (value: string) => {
    setCurrProfileKey(value)
  }

  const handleCompareIndex = (value: number) => {
    setCompareIndex(value)
    // setCurrProfile(profiles![shaIndex]![value])
  }

  if (!profiles) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="font-mono text-3xl">
          <Spin className="pr-6" size="large" />
          Preparing benchmark data 👻
        </div>
      </div>
    )
  }

  const currProfile = profiles[shaIndex][currProfileKey!]

  return (
    <div>
      <Select
        placeholder="Select a sha"
        style={{ width: 200, margin: '20px 10px' }}
        onChange={handleCompareIndex}
        options={(compares || []).map((c, index) => {
          return {
            label: (
              <span className="font-mono">
                {c.sha} ({index === 0 ? 'base' : 'to'})
              </span>
            ),
            value: index,
          }
        })}
      />
      <Select
        placeholder="Select a profile"
        style={{ width: 500, margin: '20px 10px' }}
        onChange={handleChange}
        options={Object.keys(profiles[shaIndex]).map((name) => ({
          label: <span className="font-mono">{name}</span>,
          value: name,
        }))}
      />
      {currProfile?.type === 'cpuprofile' && (
        <iframe
          frameBorder={0}
          key={currProfile.payload}
          style={{ width: '100vw', height: 'calc(100vh - 100px)' }}
          src={`/vite-benchmark/speedscope/index.html#profileURL=${encodeURIComponent(
            currProfile.payload
          )}&title=${currProfile.name}`}
        />
      )}
      {currProfile?.type === 'txt' && (
        <pre>
          <code>{currProfile.payload}</code>
        </pre>
      )}
    </div>
  )
}

type Profiles = Record<
  string,
  { name: string; payload: string; type: 'txt' | 'cpuprofile' }
>

const unzipArtifact = async (url: string) => {
  const { entries } = await unzip(url)
  const result: Profiles = {}
  const pms = Object.entries(entries).map(async ([name, entry]) => {
    if (name.endsWith('.txt')) {
      const text = await entry.text()
      result[name] = {
        name,
        type: 'txt',
        payload: text,
      }
    }

    if (name.endsWith('.cpuprofile')) {
      const blob = await entry.blob('application/json')
      const ObjectUrl = window.URL.createObjectURL(blob)
      result[name] = {
        name,
        type: 'cpuprofile',
        payload: ObjectUrl,
      }
    }
  })

  await Promise.all(pms)
  return result
}
