import { useEffect } from 'react'
import {
  useRobotAnalyticsData,
  useTrackProtocolRunEvent,
  useRecoveryAnalytics,
} from '/app/redux-resources/analytics'
import { useIsRunCurrent, useRunStatus } from '/app/resources/runs'
import { ANALYTICS_PROTOCOL_RUN_ACTION } from '/app/redux/analytics'

import { isTerminalRunStatus } from '../utils'

interface UseRunAnalyticsProps {
  runId: string | null
  robotName: string
  enteredER: boolean
}

// Implicitly send reports related to the run when the current run is terminal.
export function useRunAnalytics({
  runId,
  robotName,
  enteredER,
}: UseRunAnalyticsProps): void {
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)
  const runStatus = useRunStatus(runId)
  const isRunCurrent = useIsRunCurrent(runId)

  useEffect(() => {
    const areReportConditionsValid =
      isRunCurrent && runId != null && isTerminalRunStatus(runStatus)

    if (areReportConditionsValid) {
      trackProtocolRunEvent({
        name: ANALYTICS_PROTOCOL_RUN_ACTION.FINISH,
        properties: robotAnalyticsData ?? undefined,
      })
    }
  }, [runStatus, isRunCurrent, runId, robotAnalyticsData])

  const { reportRecoveredRunResult } = useRecoveryAnalytics()
  useEffect(() => {
    if (isRunCurrent) {
      reportRecoveredRunResult(runStatus, enteredER)
    }
  }, [isRunCurrent, enteredER])
}
