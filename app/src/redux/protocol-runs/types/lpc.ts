import type {
  DeckConfiguration,
  ModuleModel,
  LabwareDefinition2,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'
import type { VectorOffset } from '@opentrons/api-client'
import type { LPC_STEP } from '/app/redux/protocol-runs'

type LabwareURI = string
type LabwareId = string

export type LPCStep = keyof typeof LPC_STEP

export type LPCFlowType = 'default' | 'location-specific'
export type LPCOffsetKind = 'default' | 'location-specific' | 'hardcoded'

export interface StepInfo {
  currentStepIndex: number
  totalStepCount: number
  all: LPCStep[]
}

export interface ExistingOffset {
  createdAt: string
  vector: VectorOffset
}

export interface WorkingOffset {
  initialPosition: VectorOffset | null
  finalPosition: VectorOffset | null
}

export interface PositionParams {
  labwareUri: string
  location: OffsetLocationDetails
  position: VectorOffset | null
}

interface LPCLabwareOffsetDetails {
  kind: LPCOffsetKind
  labwareId: string
  definitionUri: string
  moduleModel?: ModuleModel
  moduleId?: string
  adapterId?: string
}

export interface LPCLabwareOffsetDefaultDetails
  extends LPCLabwareOffsetDetails {
  slotName: null
  kind: 'default'
}

export interface LPCLabwareOffsetAppliedLocationDetails
  extends LPCLabwareOffsetDetails {
  slotName: string
  kind: 'location-specific'
}

export interface OffsetDetails {
  existingOffset: ExistingOffset | null
  workingOffset: WorkingOffset | null
  locationDetails: OffsetLocationDetails
}

export interface LabwareDetails {
  id: LabwareId
  displayName: string
  offsetDetails: OffsetDetails[]
}

export type OffsetLocationDetails =
  | LPCLabwareOffsetDefaultDetails
  | LPCLabwareOffsetAppliedLocationDetails

export interface SelectedLabwareInfo {
  uri: LabwareURI
  id: LabwareId
  /* Indicates the type of LPC offset flow the user is performing, a "default" flow, a "location-specific" flow, or no active flow.
   * There is no `slotName` when a user performs the default offset flow.
   * Until the user is in a default or location-specific offset flow, there is no location. * */
  offsetLocationDetails: OffsetLocationDetails | null
}

export interface LPCLabwareInfo {
  selectedLabware: SelectedLabwareInfo | null
  labware: Record<LabwareURI, LabwareDetails>
}

export interface LPCWizardState {
  steps: StepInfo
  activePipetteId: string
  labwareInfo: LPCLabwareInfo
  protocolData: CompletedProtocolAnalysis
  labwareDefs: LabwareDefinition2[]
  deckConfig: DeckConfiguration
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

export interface GoBackStepAction {
  type: 'GO_BACK_STEP'
  payload: { runId: string }
}

export interface SelectedLabwareNameAction {
  type: 'SET_SELECTED_LABWARE_NAME'
  payload: {
    runId: string
    labwareUri: LabwareURI
  }
}

export interface SelectedLabwareAction {
  type: 'SET_SELECTED_LABWARE'
  payload: {
    runId: string
    labwareUri: LabwareURI
    location: OffsetLocationDetails | null
  }
}

export interface ClearSelectedLabwareAction {
  type: 'CLEAR_SELECTED_LABWARE'
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

export interface ApplyOffsetAction {
  type: 'APPLY_OFFSET'
  payload: { runId: string; labwareUri: LabwareURI }
}

export type LPCWizardAction =
  | StartLPCAction
  | FinishLPCAction
  | SelectedLabwareNameAction
  | SelectedLabwareAction
  | ClearSelectedLabwareAction
  | InitialPositionAction
  | FinalPositionAction
  | ApplyOffsetAction
  | ProceedStepAction
  | GoBackStepAction
