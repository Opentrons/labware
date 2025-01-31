import type { LegacyLabwareOffsetLocation } from '@opentrons/api-client'
import type { NAV_STEPS } from '../constants'
import type { LPCWizardContentProps } from './content'

export type LabwarePositionCheckStep =
  | BeforeBeginningStep
  | AttachProbeStep
  | CheckPositionsStep
  | DetachProbeStep
  | ResultsSummaryStep

export type LPCStepProps<T extends LabwarePositionCheckStep> = Omit<
  LPCWizardContentProps,
  'step'
> & {
  step: Extract<LabwarePositionCheckStep, T>
}

export interface PerformLPCStep {
  pipetteId: string
  labwareId: string
  location: LegacyLabwareOffsetLocation
  definitionUri: string
  adapterId?: string
  moduleId?: string
}

export interface BeforeBeginningStep {
  section: typeof NAV_STEPS.BEFORE_BEGINNING
}

export interface AttachProbeStep {
  section: typeof NAV_STEPS.ATTACH_PROBE
  pipetteId: string
}

export interface CheckPositionsStep extends PerformLPCStep {
  section: typeof NAV_STEPS.CHECK_POSITIONS
}

export interface DetachProbeStep {
  section: typeof NAV_STEPS.DETACH_PROBE
  pipetteId: string
}

export interface ResultsSummaryStep {
  section: typeof NAV_STEPS.RESULTS_SUMMARY
}
