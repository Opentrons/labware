import { useEffect, useRef, useState } from 'react'
import last from 'lodash/last'
import { schemaV6Adapter } from '@opentrons/shared-data'
import { useCurrentProtocol, useCurrentRun } from '../ProtocolUpload/hooks'
import { formatInterval } from '../RunTimeControl/utils'
import type { ProtocolFile } from '@opentrons/shared-data'
interface ProtocolDetails {
  displayName: string | null
  protocolData: ProtocolFile<{}> | null
}

// TODO(sb, 2021-11-16) Figure out why this was causing a circular dependency and move out of this hooks file
function useInterval(
  callback: () => unknown,
  delay: number | null,
  immediate: boolean = false
): void {
  const savedCallback: React.MutableRefObject<
    (() => unknown) | undefined
  > = useRef()

  // remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // set up the interval
  useEffect(() => {
    const tick = (): unknown => savedCallback.current && savedCallback.current()
    if (delay !== null && delay > 0) {
      if (immediate) tick()
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay, immediate])
}

function useNow(): string {
  const initialNow = Date()
  const [now, setNow] = useState(initialNow)
  useInterval(() => setNow(Date()), 500, true)
  return now
}

export function useProtocolDetails(): ProtocolDetails {
  let protocolData: ProtocolFile<{}> | null = null
  const protocolRecord = useCurrentProtocol()
  const protocolAnalysis = protocolRecord?.data.analyses
  if (protocolAnalysis != null) {
    const lastProtocolAnalysis = protocolAnalysis[protocolAnalysis.length - 1]
    if (lastProtocolAnalysis.status === 'completed') {
      protocolData = schemaV6Adapter(lastProtocolAnalysis)
    }
  }
  const displayName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name
  return { displayName: displayName ?? null, protocolData }
}

export function useTimeElapsedSincePause(): string | null {
  const runRecord = useCurrentRun()
  const now = useNow()
  const mostRecentAction = last(runRecord?.data.actions)
  if (
    runRecord?.data &&
    ['paused', 'pause-requested'].includes(runRecord?.data.status) &&
    mostRecentAction != null &&
    mostRecentAction?.actionType === 'pause'
  ) {
    return formatInterval(mostRecentAction.createdAt, now)
  }
  return null
}

export function useFormatRunTimestamp(): (timestamp: string) => string | null {
  const runRecord = useCurrentRun()

  return (timestamp: string) => {
    if (runRecord == null) return null // run doesn't exist
    const { actions } = runRecord.data
    const firstPlayAction = actions.find(action => action.actionType === 'play')
    if (firstPlayAction == null) return null // run is unstarted
    return formatInterval(firstPlayAction.createdAt, timestamp)
  }
}
