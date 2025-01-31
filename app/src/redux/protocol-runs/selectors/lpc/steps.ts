import { createSelector } from 'reselect'

import { LPC_STEP } from '/app/redux/protocol-runs'

import type { Selector } from 'reselect'
import type { State } from '../../../types'
import type { LPCStep } from '/app/redux/protocol-runs'

export const selectCurrentStep = (runId: string): Selector<State, LPCStep> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.steps.currentStepIndex,
    (state: State) => state.protocolRuns[runId]?.lpc?.steps.all,
    (currentIdx, allSteps) =>
      allSteps?.[currentIdx ?? 0] ?? LPC_STEP.BEFORE_BEGINNING
  )
