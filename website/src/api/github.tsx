import { endpoint } from '@octokit/endpoint'
import type { Endpoints } from '@octokit/types'
import ky from 'ky'

type ListArtifactsResponse =
  Endpoints['GET /repos/{owner}/{repo}/actions/artifacts']['response']['data']

const tokenFromQuery = new URLSearchParams(window.location.search).get('pat')

const ep = endpoint.defaults({
  headers: {
    authorization: tokenFromQuery ? `token ${tokenFromQuery}` : undefined,
  },
})

export const listArtifacts = async (name: string) => {
  const request = ep('GET /repos/{owner}/{repo}/actions/artifacts', {
    owner: 'fi3ework',
    repo: 'vite-benchmark',
    name,
  })

  const { url, ...options } = request
  const data = await ky.get(url, options as any).json<ListArtifactsResponse>()
  return data
}

export const downloadArtifacts = async (artifactId: number | string) => {
  const request = ep(
    'GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}',
    {
      owner: 'fi3ework',
      repo: 'vite-benchmark',
      artifact_id: artifactId,
      archive_format: 'zip',
    }
  )

  const { url, ...options } = request
  const data = await ky.get(url, options as any)
  return data
}
