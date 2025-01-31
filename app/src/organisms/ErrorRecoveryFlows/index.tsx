import { useLayoutEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_FAILED,
  RUN_STATUS_FINISHING,
  RUN_STATUS_IDLE,
  RUN_STATUS_PAUSED,
  RUN_STATUS_RUNNING,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_STOPPED,
  RUN_STATUS_SUCCEEDED,
} from '@opentrons/api-client'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { useHost } from '@opentrons/react-api-client'

import { getIsOnDevice } from '/app/redux/config'
import { ErrorRecoveryWizard, useERWizard } from './ErrorRecoveryWizard'
import { RecoverySplash, useRecoverySplash } from './RecoverySplash'
import { RecoveryTakeover } from './RecoveryTakeover'
import {
  useCurrentlyRecoveringFrom,
  useERUtils,
  useRecoveryTakeover,
  useRetainedFailedCommandBySource,
} from './hooks'
import { useRunLoadedLabwareDefinitionsByUri } from '/app/resources/runs'

import type { RunStatus } from '@opentrons/api-client'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { FailedCommand } from './types'
import type { RunLoadedLabwareDefinitionsByUri } from '/app/resources/runs'

const VALID_ER_RUN_STATUSES: RunStatus[] = [
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
  RUN_STATUS_STOP_REQUESTED,
]

// Effectively statuses that are not an "awaiting-recovery" status OR "stop requested."
const INVALID_ER_RUN_STATUSES: RunStatus[] = [
  RUN_STATUS_RUNNING,
  RUN_STATUS_PAUSED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_FINISHING,
  RUN_STATUS_STOPPED,
  RUN_STATUS_FAILED,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_IDLE,
]

interface UseErrorRecoveryResultBase {
  isERActive: boolean
  failedCommand: FailedCommand | null
  runLwDefsByUri: ReturnType<typeof useRunLoadedLabwareDefinitionsByUri>
}
export interface UseErrorRecoveryActiveResult
  extends UseErrorRecoveryResultBase {
  isERActive: true
  failedCommand: FailedCommand
  runLwDefsByUri: RunLoadedLabwareDefinitionsByUri
}
export interface UseErrorRecoveryInactiveResult
  extends UseErrorRecoveryResultBase {
  isERActive: false
}
export type UseErrorRecoveryResult =
  | UseErrorRecoveryInactiveResult
  | UseErrorRecoveryActiveResult

export function useErrorRecoveryFlows(
  runId: string,
  runStatus: RunStatus | null
): UseErrorRecoveryResult {
  const [isERActive, setIsERActive] = useState(false)
  const failedCommand = useCurrentlyRecoveringFrom(runId, runStatus)
  const runLwDefsByUri = useRunLoadedLabwareDefinitionsByUri(runId)

  // The complexity of this logic exists to persist Error Recovery screens past the server's definition of Error Recovery.
  // Ex, show a "cancelling run" modal in Error Recovery flows despite the robot no longer being in a recoverable state.

  const isValidERStatus = (
    status: RunStatus | null,
    hasSeenAwaitingRecovery: boolean
  ): boolean => {
    return (
      status !== null &&
      (status === RUN_STATUS_AWAITING_RECOVERY ||
        (VALID_ER_RUN_STATUSES.includes(status) && hasSeenAwaitingRecovery))
    )
  }

  // If client accesses a valid ER runs status besides AWAITING_RECOVERY but accesses it outside of Error Recovery flows,
  // don't show ER.
  useLayoutEffect(() => {
    if (runStatus != null) {
      const isAwaitingRecovery =
        VALID_ER_RUN_STATUSES.includes(runStatus) &&
        runStatus !== RUN_STATUS_STOP_REQUESTED

      if (isAwaitingRecovery) {
        setIsERActive(isValidERStatus(runStatus, true))
      } else if (INVALID_ER_RUN_STATUSES.includes(runStatus)) {
        setIsERActive(isValidERStatus(runStatus, false))
      }
    }
  }, [runStatus, failedCommand])

  // Gate ER rendering on data derived from key network requests.
  return isERActive && failedCommand != null && runLwDefsByUri != null
    ? {
        isERActive: true,
        failedCommand,
        runLwDefsByUri,
      }
    : { isERActive: false, failedCommand, runLwDefsByUri }
}

export interface ErrorRecoveryFlowsProps {
  runId: string
  runStatus: RunStatus | null
  /* In some parts of Error Recovery, such as "retry failed command" during a generic error flow, we want to utilize
   * information derived from the failed command from the run record even if there is no matching command in protocol analysis.
   * Using a failed command that is not matched to a protocol analysis command is unsafe in most circumstances (ie, in
   * non-generic recovery flows. Prefer using failedCommandBySource in most circumstances. */
  unvalidatedFailedCommand: UseErrorRecoveryActiveResult['failedCommand']
  runLwDefsByUri: UseErrorRecoveryActiveResult['runLwDefsByUri']
  protocolAnalysis: CompletedProtocolAnalysis | null
}

export function ErrorRecoveryFlows(
  props: ErrorRecoveryFlowsProps
): JSX.Element | null {
  const {
    protocolAnalysis,
    runStatus,
    unvalidatedFailedCommand,
    runLwDefsByUri,
  } = props

  const failedCommandBySource = useRetainedFailedCommandBySource(
    unvalidatedFailedCommand,
    protocolAnalysis
  )

  const { hasLaunchedRecovery, toggleERWizard, showERWizard } = useERWizard()
  const isOnDevice = useSelector(getIsOnDevice)
  const robotType = protocolAnalysis?.robotType ?? OT2_ROBOT_TYPE
  const robotName = useHost()?.robotName ?? 'robot'

  const allRunDefs = runLwDefsByUri != null ? Object.values(runLwDefsByUri) : []

  const {
    showTakeover,
    isActiveUser,
    intent,
    toggleERWizAsActiveUser,
  } = useRecoveryTakeover(toggleERWizard)

  const recoveryUtils = useERUtils({
    ...props,
    hasLaunchedRecovery,
    toggleERWizAsActiveUser,
    isOnDevice,
    robotType,
    isActiveUser,
    failedCommand: failedCommandBySource,
    allRunDefs,
    runLwDefsByUri,
  })

  const renderWizard =
    isActiveUser &&
    (showERWizard || recoveryUtils.doorStatusUtils.isProhibitedDoorOpen)
  const showSplash = useRecoverySplash(isOnDevice, renderWizard as boolean)

  return (
    <>
      {showTakeover ? (
        <RecoveryTakeover
          intent={intent}
          robotName={robotName}
          isOnDevice={isOnDevice}
          runStatus={runStatus}
        />
      ) : null}
      {renderWizard ? (
        <ErrorRecoveryWizard
          {...props}
          {...recoveryUtils}
          robotType={robotType}
          isOnDevice={isOnDevice}
          failedCommand={failedCommandBySource}
          allRunDefs={allRunDefs}
        />
      ) : null}
      {showSplash ? (
        <RecoverySplash
          {...props}
          {...recoveryUtils}
          robotType={robotType}
          robotName={robotName}
          isOnDevice={isOnDevice}
          toggleERWizAsActiveUser={toggleERWizAsActiveUser}
          failedCommand={failedCommandBySource}
          resumePausedRecovery={!renderWizard && !showTakeover}
          allRunDefs={allRunDefs}
        />
      ) : null}
    </>
  )
}
