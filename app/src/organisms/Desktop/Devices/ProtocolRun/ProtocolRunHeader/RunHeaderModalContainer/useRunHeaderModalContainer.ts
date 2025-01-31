import { useNavigate } from 'react-router-dom'

import {
  useConfirmCancelModal,
  useHeaterShakerIsRunningModal,
  useProtocolAnalysisErrorsModal,
  useRunFailedModal,
} from './modals'
import {
  useHeaterShakerConfirmationModal,
  useMissingStepsModal,
  useRunHeaderDropTip,
} from './hooks'
import { useErrorRecoveryFlows } from '/app/organisms/ErrorRecoveryFlows'
import { useProtocolDetailsForRun } from '/app/resources/runs'
import { getFallbackRobotSerialNumber } from '../utils'
import {
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
  ANALYTICS_PROTOCOL_RUN_ACTION,
  useTrackEvent,
} from '/app/redux/analytics'
import {
  useRobotAnalyticsData,
  useTrackProtocolRunEvent,
} from '/app/redux-resources/analytics'
import { useRobot, useRobotType } from '/app/redux-resources/robots'

import type { AttachedModule, RunStatus, Run } from '@opentrons/api-client'
import type { UseErrorRecoveryResult } from '/app/organisms/ErrorRecoveryFlows'
import type {
  UseRunHeaderDropTipResult,
  UseMissingStepsModalResult,
  UseHeaterShakerConfirmationModalResult,
} from './hooks'
import type {
  UseAnalysisErrorsModalResult,
  UseConfirmCancelModalResult,
  UseHeaterShakerIsRunningModalResult,
  UseRunFailedModalResult,
} from './modals'
import type { ProtocolRunHeaderProps } from '..'
import type { RunControls } from '/app/organisms/RunTimeControl'
import type { UseRunErrorsResult } from '../hooks'

interface UseRunHeaderModalContainerProps extends ProtocolRunHeaderProps {
  attachedModules: AttachedModule[]
  protocolRunControls: RunControls
  runStatus: RunStatus | null
  runRecord: Run | null
  runErrors: UseRunErrorsResult
}

export interface UseRunHeaderModalContainerResult {
  confirmCancelModalUtils: UseConfirmCancelModalResult
  runFailedModalUtils: UseRunFailedModalResult
  analysisErrorModalUtils: UseAnalysisErrorsModalResult
  HSRunningModalUtils: UseHeaterShakerIsRunningModalResult
  HSConfirmationModalUtils: UseHeaterShakerConfirmationModalResult
  missingStepsModalUtils: UseMissingStepsModalResult
  dropTipUtils: UseRunHeaderDropTipResult
  recoveryModalUtils: UseErrorRecoveryResult
}

// Provides all the utilities used by the various modals that render in ProtocolRunHeader.
export function useRunHeaderModalContainer({
  runId,
  robotName,
  runStatus,
  runRecord,
  attachedModules,
  protocolRunControls,
  runErrors,
}: UseRunHeaderModalContainerProps): UseRunHeaderModalContainerResult {
  const navigate = useNavigate()

  const { displayName } = useProtocolDetailsForRun(runId)
  const robot = useRobot(robotName)
  const robotSerialNumber = getFallbackRobotSerialNumber(robot)
  const trackEvent = useTrackEvent()
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const robotType = useRobotType(robotName)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)

  function handleProceedToRunClick(): void {
    navigate(`/devices/${robotName}/protocol-runs/${runId}/run-preview`)
    trackEvent({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: { robotSerialNumber },
    })
    trackProtocolRunEvent({
      name: ANALYTICS_PROTOCOL_RUN_ACTION.START,
      properties: robotAnalyticsData ?? {},
    })
    protocolRunControls.play()
  }

  const confirmCancelModalUtils = useConfirmCancelModal()

  const runFailedModalUtils = useRunFailedModal(runErrors)

  const analysisErrorModalUtils = useProtocolAnalysisErrorsModal({
    robotName,
    runId,
    displayName,
  })

  const HSRunningModalUtils = useHeaterShakerIsRunningModal(attachedModules)

  const HSConfirmationModalUtils = useHeaterShakerConfirmationModal(
    handleProceedToRunClick
  )

  const missingStepsModalUtils = useMissingStepsModal({
    attachedModules,
    runStatus,
    runId,
    handleProceedToRunClick,
  })

  const dropTipUtils = useRunHeaderDropTip({
    runId,
    runStatus,
    runRecord,
    robotType,
  })

  const recoveryModalUtils = useErrorRecoveryFlows(runId, runStatus)

  return {
    confirmCancelModalUtils,
    analysisErrorModalUtils,
    HSConfirmationModalUtils,
    HSRunningModalUtils,
    runFailedModalUtils,
    recoveryModalUtils,
    missingStepsModalUtils,
    dropTipUtils,
  }
}
