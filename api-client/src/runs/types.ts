import type {
  Liquid,
  LoadedLabware,
  LoadedModule,
  LoadedPipette,
  ModuleModel,
  RunCommandError,
  RunTimeCommand,
  RunTimeParameter,
  NozzleLayoutConfig,
  OnDeckLabwareLocation,
  LabwareDefinition1,
  LabwareDefinition2,
  LabwareDefinition3,
} from '@opentrons/shared-data'
import type { ResourceLink, ErrorDetails } from '../types'
export * from './commands/types'

export const RUN_STATUS_IDLE = 'idle' as const
export const RUN_STATUS_RUNNING = 'running' as const
export const RUN_STATUS_PAUSED = 'paused'
export const RUN_STATUS_STOP_REQUESTED = 'stop-requested' as const
export const RUN_STATUS_STOPPED = 'stopped' as const
export const RUN_STATUS_FAILED = 'failed' as const
export const RUN_STATUS_FINISHING = 'finishing' as const
export const RUN_STATUS_SUCCEEDED = 'succeeded' as const
export const RUN_STATUS_BLOCKED_BY_OPEN_DOOR = 'blocked-by-open-door' as const
export const RUN_STATUS_AWAITING_RECOVERY = 'awaiting-recovery' as const
export const RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR = 'awaiting-recovery-blocked-by-open-door' as const
export const RUN_STATUS_AWAITING_RECOVERY_PAUSED = 'awaiting-recovery-paused' as const

export type RunStatus =
  | typeof RUN_STATUS_IDLE
  | typeof RUN_STATUS_RUNNING
  | typeof RUN_STATUS_PAUSED
  | typeof RUN_STATUS_STOP_REQUESTED
  | typeof RUN_STATUS_STOPPED
  | typeof RUN_STATUS_FAILED
  | typeof RUN_STATUS_FINISHING
  | typeof RUN_STATUS_SUCCEEDED
  | typeof RUN_STATUS_BLOCKED_BY_OPEN_DOOR
  | typeof RUN_STATUS_AWAITING_RECOVERY
  | typeof RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR
  | typeof RUN_STATUS_AWAITING_RECOVERY_PAUSED

export interface LegacyGoodRunData {
  id: string
  createdAt: string
  completedAt?: string
  startedAt?: string
  current: boolean
  status: RunStatus
  actions: RunAction[]
  errors: RunError[]
  hasEverEnteredErrorRecovery: boolean
  pipettes: LoadedPipette[]
  labware: LoadedLabware[]
  liquids: Liquid[]
  modules: LoadedModule[]
  protocolId?: string
  labwareOffsets?: LabwareOffset[]
}

export interface KnownGoodRunData extends LegacyGoodRunData {
  ok: true
  runTimeParameters: RunTimeParameter[]
  outputFileIds: string[]
}

export interface KnownInvalidRunData extends LegacyGoodRunData {
  ok: false
  dataError: ErrorDetails
}

export type GoodRunData = KnownGoodRunData | LegacyGoodRunData

export type RunData = GoodRunData | KnownInvalidRunData

export interface VectorOffset {
  x: number
  y: number
  z: number
}
export interface LabwareOffset {
  id: string
  createdAt: string
  definitionUri: string
  location: LegacyLabwareOffsetLocation
  locationSequence?: LabwareOffsetLocationSequence
  vector: VectorOffset
}

export interface RunLoadedLabwareDefinitions {
  data: Array<LabwareDefinition1 | LabwareDefinition2 | LabwareDefinition3>
}

export interface Run {
  data: RunData
}

export interface RunCurrentState {
  data: RunCurrentStateData
  links: RunCommandLink
}

export interface RunsLinks {
  current?: ResourceLink
}

export interface RunCommandLink {
  lastCompleted: CommandLinkNoMeta
}

export interface CommandLinkNoMeta {
  id: string
  href: string
}

export interface GetRunsParams {
  pageLength?: number // the number of items to include
}

export interface Runs {
  data: readonly RunData[]
  links: RunsLinks
}

export interface RunCurrentStateData {
  estopEngaged: boolean
  activeNozzleLayouts: Record<string, NozzleLayoutValues> // keyed by pipetteId
  tipStates: Record<string, TipStates> // keyed by pipetteId
  placeLabwareState?: PlaceLabwareState
}

export const RUN_ACTION_TYPE_PLAY: 'play' = 'play'
export const RUN_ACTION_TYPE_PAUSE: 'pause' = 'pause'
export const RUN_ACTION_TYPE_STOP: 'stop' = 'stop'
export const RUN_ACTION_TYPE_RESUME_FROM_RECOVERY: 'resume-from-recovery' =
  'resume-from-recovery'
export const RUN_ACTION_TYPE_RESUME_FROM_RECOVERY_ASSUMING_FALSE_POSITIVE: 'resume-from-recovery-assuming-false-positive' =
  'resume-from-recovery-assuming-false-positive'

export type RunActionType =
  | typeof RUN_ACTION_TYPE_PLAY
  | typeof RUN_ACTION_TYPE_PAUSE
  | typeof RUN_ACTION_TYPE_STOP
  | typeof RUN_ACTION_TYPE_RESUME_FROM_RECOVERY
  | typeof RUN_ACTION_TYPE_RESUME_FROM_RECOVERY_ASSUMING_FALSE_POSITIVE

export interface RunAction {
  id: string
  createdAt: string
  actionType: RunActionType
}

export interface CreateRunActionData {
  actionType: RunActionType
}

export interface OnAddressableAreaLabwareOffsetLocationSequenceComponent {
  kind: 'onAddressableArea'
  labware: string
}

export interface OnModuleOffsetLocationSequenceComponent {
  kind: 'onModule'
  moduleModel: ModuleModel
}

export interface OnLabwareOffsetLocationSequenceComponent {
  kind: 'onLabware'
  labwareUri: string
}

export type LabwareOffsetLocationSequenceComponent =
  | OnAddressableAreaLabwareOffsetLocationSequenceComponent
  | OnModuleOffsetLocationSequenceComponent
  | OnLabwareOffsetLocationSequenceComponent
export type LabwareOffsetLocationSequence = LabwareOffsetLocationSequenceComponent[]

export interface LegacyLabwareOffsetLocation {
  slotName: string
  moduleModel?: ModuleModel
  definitionUri?: string
}
export interface LegacyLabwareOffsetCreateData {
  definitionUri: string
  location: LegacyLabwareOffsetLocation
  vector: VectorOffset
}

type RunTimeParameterValuesType = string | number | boolean | { id: string }
export type RunTimeParameterValuesCreateData = Record<
  string,
  RunTimeParameterValuesType
>
export type RunTimeParameterFilesCreateData = Record<string, string>

export interface CommandData {
  data: RunTimeCommand
}

// Although run errors are semantically different from command errors,
// the server currently happens to use the exact same model for both.
export type RunError = RunCommandError

/**
 * Error Policy
 */

export type IfMatchType =
  | 'assumeFalsePositiveAndContinue'
  | 'ignoreAndContinue'
  | 'failRun'
  | 'waitForRecovery'

export interface ErrorRecoveryPolicy {
  policyRules: Array<{
    matchCriteria: {
      command: {
        commandType: RunTimeCommand['commandType']
        error: {
          errorType: RunCommandError['errorType']
        }
      }
    }
    ifMatch: IfMatchType
  }>
}

export interface UpdateErrorRecoveryPolicyRequest {
  data: ErrorRecoveryPolicy
}

export type UpdateErrorRecoveryPolicyResponse = Record<string, never>
export type ErrorRecoveryPolicyResponse = UpdateErrorRecoveryPolicyRequest

/**
 * Current Run State Data
 */
export interface NozzleLayoutValues {
  startingNozzle: string
  activeNozzles: string[]
  config: NozzleLayoutConfig
}

export interface PlaceLabwareState {
  labwareURI: string
  location: OnDeckLabwareLocation
  shouldPlaceDown: boolean
}

export interface TipStates {
  hasTip: boolean
}
