import { useState } from 'react'
import head from 'lodash/head'

import { useRunCurrentState } from '@opentrons/react-api-client'
import { getPipetteModelSpecs } from '@opentrons/shared-data'
import { useTipAttachmentStatus } from '/app/resources/instruments'
import { ERROR_KINDS } from '/app/organisms/ErrorRecoveryFlows/constants'
import { getErrorKind } from '/app/organisms/ErrorRecoveryFlows/utils'

import type { Run, Instruments, PipetteData } from '@opentrons/api-client'
import type {
  PipetteWithTip,
  TipAttachmentStatusResult,
} from '/app/resources/instruments'
import type { ERUtilsProps } from '/app/organisms/ErrorRecoveryFlows/hooks/useERUtils'

interface UseRecoveryTipStatusProps {
  runId: string
  failedCommand: ERUtilsProps['failedCommand']
  failedPipetteInfo: PipetteData | null
  attachedInstruments?: Instruments
  runRecord?: Run
}

export type RecoveryTipStatusUtils = TipAttachmentStatusResult & {
  /* Whether the robot is currently determineTipStatus() */
  isLoadingTipStatus: boolean
  runId: string
  gripperErrorFirstPipetteWithTip: string | null
}

// Wraps the tip attachment status utils with Error Recovery specific states and values.
export function useRecoveryTipStatus(
  props: UseRecoveryTipStatusProps
): RecoveryTipStatusUtils {
  const [isLoadingTipStatus, setIsLoadingTipStatus] = useState(false)
  const [
    failedCommandPipette,
    setFailedCommandPipette,
  ] = useState<PipetteWithTip | null>(null)

  const tipAttachmentStatusUtils = useTipAttachmentStatus({
    ...props,
    runRecord: props.runRecord ?? null,
  })

  const determineTipStatusWithLoading = (): Promise<PipetteWithTip[]> => {
    const { determineTipStatus } = tipAttachmentStatusUtils
    const { failedPipetteInfo } = props
    setIsLoadingTipStatus(true)

    return determineTipStatus().then(pipettesWithTip => {
      // In cases in which determineTipStatus doesn't think a tip could be attached to any pipette, supply the pipette
      // involved in the failed command, if any.
      let failedCommandPipettes: PipetteWithTip[]
      const specs =
        failedPipetteInfo != null
          ? getPipetteModelSpecs(failedPipetteInfo.instrumentModel)
          : null

      if (
        pipettesWithTip.length === 0 &&
        failedPipetteInfo != null &&
        specs != null
      ) {
        const currentPipette: PipetteWithTip = {
          mount: failedPipetteInfo.mount,
          specs,
        }

        failedCommandPipettes = [currentPipette]
      } else {
        failedCommandPipettes = pipettesWithTip
      }

      setIsLoadingTipStatus(false)
      setFailedCommandPipette(head(failedCommandPipettes) ?? null)

      return Promise.resolve(pipettesWithTip)
    })
  }

  // TODO(jh, 11-15-24): This is temporary. Collaborate with design a better way to do drop tip wizard for multiple
  //  pipettes during error recovery. The tip detection logic will shortly be simplified, too!
  const errorKind = getErrorKind(props.failedCommand)
  const currentTipStates =
    useRunCurrentState(props.runId, {
      enabled: errorKind === ERROR_KINDS.GRIPPER_ERROR,
    }).data?.data.tipStates ?? null

  const gripperErrorFirstPipetteWithTip =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.entries(currentTipStates ?? {}).find(
      ([_, state]) => state.hasTip
    )?.[0] ?? null

  return {
    ...tipAttachmentStatusUtils,
    aPipetteWithTip: failedCommandPipette,
    determineTipStatus: determineTipStatusWithLoading,
    isLoadingTipStatus,
    runId: props.runId,
    gripperErrorFirstPipetteWithTip,
  }
}
