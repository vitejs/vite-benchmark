import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { downloadArtifacts, listArtifacts } from '../api/github'

export const ComparePage = () => {
  const [src, setSrc] = useState('')
  let [searchParams, setSearchParams] = useSearchParams()
  const fromString = searchParams.get('from') // like vitejs/vite@0f9ad68
  const toString = searchParams.get('to')
  const fromParsed = /(.*)\/(.*)@(.*)/.exec(fromString!)
  const [fromFull, fromOwner, fromName, fromSha] = fromParsed!
  const from = { owner: fromOwner, name: fromName, sha: fromSha }
  const toParsed = /(.*)\/(.*)@(.*)/.exec(toString!)
  const [toFull, toOwner, toName, toSha] = toParsed!
  const to = { owner: toOwner, name: toName, sha: toSha }

  const fromArtifactName = `benchmark-artifact-${from.owner}___${from.name}-${from.sha}`
  const toArtifactName = `benchmark-artifact-${to.owner}___${to.name}-${to.sha}`

  const { data } = useQuery(
    ['listArtifacts', fromArtifactName],
    () => listArtifacts(fromArtifactName),
    {
      select: (data) => {
        const artifact = data.artifacts.find(
          (a) => a.name === fromArtifactName
        )!

        return artifact.id
      },
    }
  )

  useQuery(
    ['downloadArtifacts', data, downloadArtifacts],
    () => downloadArtifacts(data!),
    {
      enabled: data !== undefined,
      select: (data) => {
        // const url = artifact.archive_download_url
      },
    }
  )

  // useEffect(() => {
  //   const blob = new Blob(
  //     [
  //       `{"nodes":[{"id":1,"callFrame":{"functionName":"(root)","scriptId":"0","url":"","lineNumber":-1,"columnNumber":-1},"hitCount":0,"children":[2]},{"id":2,"callFrame":{"functionName":"","scriptId":"164","url":"","lineNumber":0,"columnNumber":0},"hitCount":0,"children":[3]},{"id":3,"callFrame":{"functionName":"a","scriptId":"164","url":"","lineNumber":0,"columnNumber":10},"hitCount":0,"children":[4,6]},{"id":4,"callFrame":{"functionName":"b","scriptId":"164","url":"","lineNumber":5,"columnNumber":10},"hitCount":0,"children":[5]},{"id":5,"callFrame":{"functionName":"d","scriptId":"164","url":"","lineNumber":13,"columnNumber":10},"hitCount":14,"positionTicks":[{"line":16,"ticks":13},{"line":14,"ticks":1}],"children":[]},{"id":6,"callFrame":{"functionName":"c","scriptId":"164","url":"","lineNumber":9,"columnNumber":10},"hitCount":0,"children":[7]},{"id":7,"callFrame":{"functionName":"d","scriptId":"164","url":"","lineNumber":13,"columnNumber":10},"hitCount":14,"positionTicks":[{"line":16,"ticks":14}],"children":[]}],"startTime":163140599286,"endTime":163140647178,"samples":[2,5,5,5,5,5,5,5,5,5,5,5,5,5,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7],"timeDeltas":[11575,1060,1045,1270,1271,1187,1274,1270,1020,1249,1258,1272,1266,1075,1271,1274,1268,1266,1289,1286,1272,1136,1276,1274,1265,1265,1271,1272,1143]}`,
  //     ],
  //     {
  //       type: 'application/json',
  //     }
  //   )

  //   const ObjectUrl = window.URL.createObjectURL(blob)

  //   setSrc(ObjectUrl)

  //   return () => {}
  // }, [])

  if (!src) return null

  return (
    <div>
      <iframe
        width={800}
        height={800}
        src={`/vite-benchmark/speedscope/index.html#profileURL=${encodeURIComponent(
          src
        )}&title=11`}
      />
    </div>
  )
}
