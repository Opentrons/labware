import {
  PROCEED_STEP,
  SET_INITIAL_POSITION,
  SET_FINAL_POSITION,
  START_LPC,
  FINISH_LPC,
  GO_BACK_STEP,
  SET_SELECTED_LABWARE,
  CLEAR_SELECTED_LABWARE,
  SET_SELECTED_LABWARE_NAME,
  APPLY_OFFSET,
} from '../constants'

import type {
  FinalPositionAction,
  InitialPositionAction,
  StartLPCAction,
  LPCWizardState,
  PositionParams,
  ProceedStepAction,
  FinishLPCAction,
  GoBackStepAction,
  SelectedLabwareAction,
  ClearSelectedLabwareAction,
  SelectedLabwareNameAction,
  OffsetLocationDetails,
  ApplyOffsetAction,
} from '../types'

export const proceedStep = (runId: string): ProceedStepAction => ({
  type: PROCEED_STEP,
  payload: { runId },
})

export const goBackStep = (runId: string): GoBackStepAction => ({
  type: GO_BACK_STEP,
  payload: { runId },
})

export const setSelectedLabwareName = (
  runId: string,
  labwareUri: string
): SelectedLabwareNameAction => ({
  type: SET_SELECTED_LABWARE_NAME,
  payload: {
    runId,
    labwareUri,
  },
})

export const setSelectedLabware = (
  runId: string,
  labwareUri: string,
  location: OffsetLocationDetails | null
): SelectedLabwareAction => ({
  type: SET_SELECTED_LABWARE,
  payload: {
    runId,
    labwareUri,
    location,
  },
})

export const clearSelectedLabware = (
  runId: string
): ClearSelectedLabwareAction => ({
  type: CLEAR_SELECTED_LABWARE,
  payload: { runId },
})

export const setInitialPosition = (
  runId: string,
  params: PositionParams
): InitialPositionAction => ({
  type: SET_INITIAL_POSITION,
  payload: { ...params, runId },
})

export const setFinalPosition = (
  runId: string,
  params: PositionParams
): FinalPositionAction => ({
  type: SET_FINAL_POSITION,
  payload: { ...params, runId },
})

export const applyOffset = (
  runId: string,
  labwareUri: string
): ApplyOffsetAction => ({
  type: APPLY_OFFSET,
  payload: { runId, labwareUri },
})

export const startLPC = (
  runId: string,
  state: LPCWizardState
): StartLPCAction => ({
  type: START_LPC,
  payload: { runId, state },
})

export const closeLPC = (runId: string): FinishLPCAction => ({
  type: FINISH_LPC,
  payload: { runId },
})
