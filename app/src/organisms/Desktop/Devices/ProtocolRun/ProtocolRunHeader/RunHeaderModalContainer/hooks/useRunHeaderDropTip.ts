import { useEffect } from 'react'

import { RUN_STATUS_IDLE, RUN_STATUS_STOPPED } from '@opentrons/api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { useErrorRecoverySettings } from '@opentrons/react-api-client'

import { useDropTipWizardFlows } from '/app/organisms/DropTipWizardFlows'
import { useProtocolDropTipModal } from '../modals'
import {
  useCloseCurrentRun,
  useCurrentRunCommands,
  useIsRunCurrent,
} from '/app/resources/runs'
import { isTerminalRunStatus } from '../../utils'
import { useTipAttachmentStatus } from '/app/resources/instruments'
import { lastRunCommandPromptedErrorRecovery } from '/app/local-resources/commands'

import type { RobotType } from '@opentrons/shared-data'
import type { Run, RunStatus } from '@opentrons/api-client'
import type {
  PipetteWithTip,
  TipAttachmentStatusResult,
} from '/app/resources/instruments'
import type { DropTipWizardFlowsProps } from '/app/organisms/DropTipWizardFlows'
import type { UseProtocolDropTipModalResult } from '../modals'
import type { PipetteDetails } from '/app/resources/maintenance_runs'

export type RunHeaderDropTipWizProps =
  | { showDTWiz: true; dtWizProps: DropTipWizardFlowsProps }
  | { showDTWiz: false; dtWizProps: null }

export interface UseRunHeaderDropTipParams {
  runId: string
  runRecord: Run | null
  robotType: RobotType
  runStatus: RunStatus | null
}

export interface UseRunHeaderDropTipResult {
  dropTipModalUtils: UseProtocolDropTipModalResult
  dropTipWizardUtils: RunHeaderDropTipWizProps
  resetTipStatus: TipAttachmentStatusResult['resetTipStatus']
}

// Handles all the tip related logic during a protocol run on the desktop app.
export function useRunHeaderDropTip({
  runId,
  runRecord,
  robotType,
  runStatus,
}: UseRunHeaderDropTipParams): UseRunHeaderDropTipResult {
  const isRunCurrent = useIsRunCurrent(runId)
  const enteredER = runRecord?.data.hasEverEnteredErrorRecovery ?? false

  const { closeCurrentRun } = useCloseCurrentRun()
  const { showDTWiz, disableDTWiz, enableDTWiz } = useDropTipWizardFlows()

  const {
    areTipsAttached,
    determineTipStatus,
    resetTipStatus,
    setTipStatusResolved,
    aPipetteWithTip,
    initialPipettesWithTipsCount,
  } = useTipAttachmentStatus({
    runId,
    runRecord: runRecord ?? null,
  })

  const dropTipModalUtils = useProtocolDropTipModal({
    areTipsAttached,
    enableDTWiz,
    isRunCurrent,
    currentRunId: runId,
    pipetteInfo: buildPipetteDetails(aPipetteWithTip),
    onSkipAndHome: () => {
      closeCurrentRun()
    },
  })

  // The onCloseFlow for Drop Tip Wizard
  const onCloseFlow = (isTakeover?: boolean): void => {
    if (isTakeover) {
      disableDTWiz()
    } else {
      void setTipStatusResolved(() => {
        disableDTWiz()
        closeCurrentRun()
      }, disableDTWiz)
    }
  }

  const buildDTWizUtils = (): RunHeaderDropTipWizProps => {
    return showDTWiz && aPipetteWithTip != null
      ? {
          showDTWiz: true,
          dtWizProps: {
            robotType,
            mount: aPipetteWithTip.mount,
            instrumentModelSpecs: aPipetteWithTip.specs,
            closeFlow: onCloseFlow,
            modalStyle: 'simple',
          },
        }
      : { showDTWiz: false, dtWizProps: null }
  }

  const { data } = useErrorRecoverySettings()
  const isEREnabled = data?.data.enabled ?? true
  const runSummaryNoFixit = useCurrentRunCommands(
    {
      includeFixitCommands: false,
      pageLength: 1,
    },
    { enabled: isTerminalRunStatus(runStatus) }
  )

  // Manage tip checking
  useEffect(() => {
    // If a user begins a new run without navigating away from the run page, reset tip status.
    if (robotType === FLEX_ROBOT_TYPE) {
      if (runStatus === RUN_STATUS_IDLE) {
        resetTipStatus()
      }
      // Only run tip checking if it wasn't *just* handled during Error Recovery.
      else if (
        !lastRunCommandPromptedErrorRecovery(runSummaryNoFixit, isEREnabled) &&
        isRunCurrent &&
        isTerminalRunStatus(runStatus)
      ) {
        void determineTipStatus()
      }
    }
  }, [runStatus, robotType, isRunCurrent, runSummaryNoFixit, isEREnabled])

  // If the run terminates with a "stopped" status, close the run if no tips are attached after running tip check at least once.
  // This marks the robot as "not busy" if drop tip CTAs are unnecessary.
  useEffect(() => {
    if (
      runStatus === RUN_STATUS_STOPPED &&
      isRunCurrent &&
      (initialPipettesWithTipsCount === 0 || robotType === OT2_ROBOT_TYPE)
    ) {
      closeCurrentRun()
    }
  }, [runStatus, isRunCurrent, enteredER, initialPipettesWithTipsCount])

  return {
    dropTipModalUtils,
    dropTipWizardUtils: buildDTWizUtils(),
    resetTipStatus,
  }
}

// TODO(jh, 09-12-24): Consolidate this with the same utility that exists elsewhere.
function buildPipetteDetails(
  aPipetteWithTip: PipetteWithTip | null
): PipetteDetails | null {
  return aPipetteWithTip != null
    ? {
        pipetteId: aPipetteWithTip.specs.name,
        mount: aPipetteWithTip.mount,
      }
    : null
}
