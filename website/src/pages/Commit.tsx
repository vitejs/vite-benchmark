import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { downloadArtifacts, listArtifacts } from '../api/github'
import { unzip, setOptions } from 'unzipit'
import { Select } from 'antd'

const worker = new URL('unzipit/dist/unzipit-worker.module.js', import.meta.url)

setOptions({
  useWorkers: true,
  workerURL: worker.href,
  // workerURL: 'https://unpkg.com/unzipit@0.1.9/dist/unzipit-worker.module.js',
  numWorkers: 2,
})

export const CommitPage = () => {
  const [profiles, setProfiles] = useState<Profiles>()
  const [currProfile, setCurrProfile] = useState<Profiles[number]>()
  let [searchParams, setSearchParams] = useSearchParams()

  const composeArtifactName = useCallback((str: string) => {
    const parsed = /(.*)\/(.*)@(.*)/.exec(str)
    const [, owner, name, sha] = parsed!
    return `benchmark-artifact-${owner}___${name}-${sha}`
  }, [])

  const artifactName = composeArtifactName(searchParams.get('sha')!) // like vitejs/vite@0f9ad68

  const { data } = useQuery(
    ['listArtifacts', artifactName],
    () => listArtifacts(artifactName),
    {
      select: (data) => {
        const artifact = data.artifacts.find((a) => a.name === artifactName)!
        return artifact.id
      },
    }
  )

  useQuery(['downloadArtifacts', data], () => downloadArtifacts(data!), {
    retry: false,
    enabled: data !== undefined,
    onSuccess: async (data) => {
      const result = await unzipArtifact(data.url)
      setProfiles(result)
    },
  })

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
