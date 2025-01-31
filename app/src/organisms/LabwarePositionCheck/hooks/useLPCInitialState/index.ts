import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { startLPC, LPC_STEPS } from '/app/redux/protocol-runs'
import { getActivePipetteId } from './utils'

import type { LPCWizardState } from '/app/redux/protocol-runs'
import type { LPCWizardFlexProps } from '/app/organisms/LabwarePositionCheck/LPCWizardFlex'

export interface UseLPCInitialStateProps
  extends Omit<LPCWizardFlexProps, 'onCloseClick'> {}

export function useLPCInitialState({
  mostRecentAnalysis,
  runId,
  labwareDefs,
  ...rest
}: UseLPCInitialStateProps): void {
  const dispatch = useDispatch()

  useEffect(() => {
    const activePipetteId = getActivePipetteId(mostRecentAnalysis.pipettes)

    const initialState: LPCWizardState = {
      ...rest,
      protocolData: mostRecentAnalysis,
      labwareDefs,
      activePipetteId,
      steps: {
        currentStepIndex: 0,
        totalStepCount: LPC_STEPS.length,
        all: LPC_STEPS,
      },
    }

    dispatch(startLPC(runId, initialState))
  }, [])
}
