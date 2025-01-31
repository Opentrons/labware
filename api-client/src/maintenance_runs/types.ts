import type {
  Liquid,
  LoadedLabware,
  LoadedModule,
  LoadedPipette,
} from '@opentrons/shared-data'
import type {
  RunCommandSummary,
  LegacyLabwareOffsetCreateData,
  RunStatus,
  RunAction,
} from '../runs'

export interface MaintenanceRunData {
  id: string
  createdAt: string
  status: RunStatus
  current: boolean
  actions: RunAction[]
  errors: MaintenanceRunError[]
  pipettes: LoadedPipette[]
  modules: LoadedModule[]
  labware: LoadedLabware[]
  liquids: Liquid[]
  completedAt?: string
  startedAt?: string
}

export interface MaintenanceRun {
  data: MaintenanceRunData
}

export interface MaintenanceCommandData {
  data: RunCommandSummary
}

export interface MaintenanceRunError {
  id: string
  errorType: string
  createdAt: string
  detail: string
}

export interface CreateMaintenanceRunData {
  labwareOffsets?: LegacyLabwareOffsetCreateData[]
}

export interface LabwareDefinitionSummary {
  definitionUri: string
}
