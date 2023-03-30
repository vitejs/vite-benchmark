import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { unzip, setOptions } from 'unzipit'
import { Select } from 'antd'
import { composeZipUrl } from '../api/github'

const worker = new URL('unzipit/dist/unzipit-worker.module.js', import.meta.url)

setOptions({
  useWorkers: true,
  workerURL: worker.href,
  numWorkers: 2,
})

export const CommitPage = () => {
  const [profiles, setProfiles] = useState<Profiles>()
  const [currProfile, setCurrProfile] = useState<Profiles[number]>()
  let [searchParams, setSearchParams] = useSearchParams()

  const fetchZip = useCallback(async (url: string) => {
    const result = await unzipArtifact(url)
    setProfiles(result)
  }, [])

  useEffect(() => {
    const artifactName = searchParams.get('sha')! // like vitejs/vite@0f9ad68
    fetchZip(composeZipUrl(artifactName))
  }, [])

  const handleChange = (value: any) => {
    setCurrProfile(profiles![value])
  }

  if (!profiles) {
    return <div>loading...</div>
  }

  return (
    <div>
      <Select
        placeholder="Select a profile"
        style={{ width: 500, margin: '20px 10px' }}
        onChange={handleChange}
        options={Object.keys(profiles).map((name) => ({
          label: name,
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
