import type {
  DeckConfiguration,
  LabwareDefinition2,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'
import type {
  LegacyLabwareOffsetLocation,
  VectorOffset,
  LabwareOffset,
} from '@opentrons/api-client'

// TODO(jh, 01-16-25): Make sure there's no cross importing after `steps` is refactored.
// eslint-disable-next-line opentrons/no-imports-across-applications
import type { StepsInfo } from '/app/organisms/LabwarePositionCheck/redux/types'

export interface PositionParams {
  labwareId: string
  location: LegacyLabwareOffsetLocation
  position: VectorOffset | null
}

export interface WorkingOffset {
  labwareId: string
  location: LegacyLabwareOffsetLocation
  initialPosition: VectorOffset | null
  finalPosition: VectorOffset | null
}

export interface LPCWizardState {
  workingOffsets: WorkingOffset[]
  protocolData: CompletedProtocolAnalysis
  labwareDefs: LabwareDefinition2[]
  deckConfig: DeckConfiguration
  steps: StepsInfo
  existingOffsets: LabwareOffset[]
  protocolName: string
  maintenanceRunId: string
}

export interface StartLPCAction {
  type: 'START_LPC'
  payload: { runId: string; state: LPCWizardState }
}

export interface FinishLPCAction {
  type: 'FINISH_LPC'
  payload: { runId: string }
}

export interface ProceedStepAction {
  type: 'PROCEED_STEP'
  payload: { runId: string }
}

export interface InitialPositionAction {
  type: 'SET_INITIAL_POSITION'
  payload: PositionParams & { runId: string }
}

export interface FinalPositionAction {
  type: 'SET_FINAL_POSITION'
  payload: PositionParams & { runId: string }
}

export type LPCWizardAction =
  | StartLPCAction
  | FinishLPCAction
  | InitialPositionAction
  | FinalPositionAction
  | ProceedStepAction
