import type { Dispatch, SetStateAction } from 'react'
import type { useCreateCommandMutation } from '@opentrons/react-api-client'
import type { PipetteMount, CreateCommand } from '@opentrons/shared-data'
import type { SECTIONS, FLOWS } from './constants'
import type { AttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'

export type PipetteWizardStep =
  | BeforeBeginningStep
  | DetachProbeStep
  | AttachProbeStep
  | ResultsStep
  | MountPipetteStep
  | DetachPipetteStep
  | MountingPlateStep
  | CarriageStep
  | FirmwareUpdateStep

export type PipetteWizardFlow =
  | typeof FLOWS.ATTACH
  | typeof FLOWS.DETACH
  | typeof FLOWS.CALIBRATE

export interface BaseStep {
  mount: PipetteMount
  flowType: PipetteWizardFlow
}
export interface BeforeBeginningStep extends BaseStep {
  section: typeof SECTIONS.BEFORE_BEGINNING
}

export interface DetachProbeStep extends BaseStep {
  section: typeof SECTIONS.DETACH_PROBE
}

export interface AttachProbeStep extends BaseStep {
  section: typeof SECTIONS.ATTACH_PROBE
}

export interface ResultsStep extends BaseStep {
  section: typeof SECTIONS.RESULTS
  nextMount?: string
}
export interface MountPipetteStep extends BaseStep {
  section: typeof SECTIONS.MOUNT_PIPETTE
}
export interface DetachPipetteStep extends BaseStep {
  section: typeof SECTIONS.DETACH_PIPETTE
}
export interface CarriageStep extends BaseStep {
  section: typeof SECTIONS.CARRIAGE
}
export interface MountingPlateStep extends BaseStep {
  section: typeof SECTIONS.MOUNTING_PLATE
}

export interface FirmwareUpdateStep extends BaseStep {
  section: typeof SECTIONS.FIRMWARE_UPDATE
}

type CreateCommandMutate = ReturnType<
  typeof useCreateCommandMutation
>['createCommand']
export type CreateRunCommand = (
  params: Parameters<CreateCommandMutate>,
  options?: Parameters<CreateCommandMutate>[1]
) => ReturnType<CreateCommandMutate>

export type SelectablePipettes = '96-Channel' | 'Single-Channel_and_8-Channel'

export interface PipetteWizardStepProps {
  flowType: PipetteWizardFlow
  mount: PipetteMount
  proceed: () => void
  goBack: () => void
  chainRunCommands?: (
    commands: CreateCommand[],
    continuePastCommandFailure: boolean
  ) => Promise<unknown>
  isRobotMoving: boolean
  maintenanceRunId?: string
  attachedPipettes: AttachedPipettesFromInstrumentsQuery
  setShowErrorMessage: Dispatch<SetStateAction<string | null>>
  errorMessage: string | null
  selectedPipette: SelectablePipettes
  isOnDevice: boolean | null
}
