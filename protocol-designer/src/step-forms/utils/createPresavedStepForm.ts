import last from 'lodash/last'
import {
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import {
  createBlankForm,
  getNextDefaultEngageHeight,
  getNextDefaultMagnetAction,
  getNextDefaultPipetteId,
  getNextDefaultTemperatureModuleId,
  getNextDefaultThermocyclerModuleId,
  handleFormChange,
} from '../../steplist/formLevel'
import {
  getModuleOnDeckByType,
  getMagnetLabwareEngageHeight,
} from '../../ui/modules/utils'
import { maskField } from '../../steplist/fieldLevel'
import type {
  PipetteEntities,
  LabwareEntities,
  RobotState,
  Timeline,
  AdditionalEquipmentEntities,
} from '@opentrons/step-generation'
import type { FormData, StepType, StepIdType } from '../../form-types'
import type { InitialDeckSetup } from '../types'
import type { FormPatch } from '../../steplist/actions/types'
import type { SavedStepFormState, OrderedStepIdsState } from '../reducers'

export interface CreatePresavedStepFormArgs {
  stepId: StepIdType
  stepType: StepType
  pipetteEntities: PipetteEntities
  labwareEntities: LabwareEntities
  savedStepForms: SavedStepFormState
  orderedStepIds: OrderedStepIdsState
  initialDeckSetup: InitialDeckSetup
  robotStateTimeline: Timeline
  additionalEquipmentEntities: AdditionalEquipmentEntities
}
type FormUpdater = (arg0: FormData) => FormPatch | null

const _patchDefaultPipette = (args: {
  initialDeckSetup: InitialDeckSetup
  labwareEntities: LabwareEntities
  orderedStepIds: OrderedStepIdsState
  pipetteEntities: PipetteEntities
  savedStepForms: SavedStepFormState
}): FormUpdater => formData => {
  const {
    initialDeckSetup,
    labwareEntities,
    orderedStepIds,
    pipetteEntities,
    savedStepForms,
  } = args
  const defaultPipetteId = getNextDefaultPipetteId(
    savedStepForms,
    orderedStepIds,
    initialDeckSetup.pipettes
  )
  // If there is a `pipette` field in the form,
  // then set `pipette` field of new steps to the next default pipette id.
  //
  // In order to trigger dependent field changes (eg default disposal volume),
  // update the form thru handleFormChange.
  const formHasPipetteField = formData && 'pipette' in formData

  if (formHasPipetteField && defaultPipetteId !== '') {
    const updatedFields = handleFormChange(
      {
        pipette: defaultPipetteId,
      },
      formData,
      pipetteEntities,
      labwareEntities
    )
    return updatedFields
  }

  return null
}

const _patchDefaultDropTipLocation = (args: {
  additionalEquipmentEntities: AdditionalEquipmentEntities
  labwareEntities: LabwareEntities
  pipetteEntities: PipetteEntities
}): FormUpdater => formData => {
  const { additionalEquipmentEntities, labwareEntities, pipetteEntities } = args
  const trashBin = Object.values(additionalEquipmentEntities).find(
    aE => aE.name === 'trashBin'
  )
  const wasteChute = Object.values(additionalEquipmentEntities).find(
    aE => aE.name === 'wasteChute'
  )
  let defaultDropTipId = null
  if (wasteChute != null) {
    defaultDropTipId = wasteChute.id
  } else if (trashBin != null) {
    defaultDropTipId = trashBin.id
  }
  const formHasDropTipField = formData && 'dropTip_location' in formData

  if (formHasDropTipField && defaultDropTipId !== null) {
    const updatedFields = handleFormChange(
      {
        dropTip_location: defaultDropTipId,
      },
      formData,
      pipetteEntities,
      labwareEntities
    )
    return updatedFields
  }

  return null
}

const _patchDefaultLabwareLocations = (args: {
  labwareEntities: LabwareEntities
  pipetteEntities: PipetteEntities
  stepType: StepType
}): FormUpdater => formData => {
  const { labwareEntities, pipetteEntities, stepType } = args

  const formHasMoveLabware =
    formData && 'labware' in formData && stepType === 'moveLabware'

  const filteredLabware = Object.values(labwareEntities).filter(
    lw =>
      // Filter out the tiprack, adapter, and lid entities
      !lw.def?.parameters.isTiprack &&
      !lw.def?.allowedRoles?.includes('adapter') &&
      !lw.def?.allowedRoles?.includes('lid')
  )

  const filteredMoveLabware = Object.values(labwareEntities).filter(
    lw =>
      // Filter out adapter entities
      !lw.def?.allowedRoles?.includes('adapter')
  )

  const formHasAspirateLabware = formData && 'aspirate_labware' in formData
  const formHasMixLabware =
    formData && 'labware' in formData && stepType === 'mix'

  if (filteredLabware.length === 1 && formHasAspirateLabware) {
    return handleFormChange(
      { aspirate_labware: filteredLabware[0].id ?? null },
      formData,
      pipetteEntities,
      labwareEntities
    )
  }

  if (filteredLabware.length === 1 && formHasMixLabware) {
    return handleFormChange(
      { labware: filteredLabware[0].id ?? null },
      formData,
      pipetteEntities,
      labwareEntities
    )
  }

  if (filteredMoveLabware.length === 1 && formHasMoveLabware) {
    return handleFormChange(
      { labware: filteredMoveLabware[0].id },
      formData,
      pipetteEntities,
      labwareEntities
    )
  }

  return null
}

const _patchDefaultMagnetFields = (args: {
  initialDeckSetup: InitialDeckSetup
  orderedStepIds: OrderedStepIdsState
  savedStepForms: SavedStepFormState
  stepType: StepType
}): FormUpdater => () => {
  const { initialDeckSetup, orderedStepIds, savedStepForms, stepType } = args

  if (stepType !== 'magnet') {
    return null
  }

  const moduleId =
    getModuleOnDeckByType(initialDeckSetup, MAGNETIC_MODULE_TYPE)?.id || null
  const magnetAction = getNextDefaultMagnetAction(
    savedStepForms,
    orderedStepIds
  )
  const defaultEngageHeight = getMagnetLabwareEngageHeight(
    initialDeckSetup,
    moduleId
  )
  const stringDefaultEngageHeight = defaultEngageHeight
    ? maskField('engageHeight', defaultEngageHeight)
    : null
  const prevEngageHeight = getNextDefaultEngageHeight(
    savedStepForms,
    orderedStepIds
  )
  // 'magnet' steps only.
  //
  // if no previously saved engageHeight, autopopulate with recommended value
  // recommended value is null when no labware found on module
  //
  // Bypass dependent field changes, do not use handleFormChange
  const engageHeight = prevEngageHeight || stringDefaultEngageHeight
  return {
    moduleId,
    magnetAction,
    engageHeight,
  }
}

const _patchTemperatureModuleId = (args: {
  initialDeckSetup: InitialDeckSetup
  orderedStepIds: OrderedStepIdsState
  savedStepForms: SavedStepFormState
  stepType: StepType
}): FormUpdater => () => {
  const { initialDeckSetup, orderedStepIds, savedStepForms, stepType } = args
  const numOfModules =
    Object.values(initialDeckSetup.modules).filter(
      module => module.type === TEMPERATURE_MODULE_TYPE
    )?.length ?? 1
  const hasTemperatureModuleId =
    stepType === 'pause' || stepType === 'temperature'

  // Auto-populate moduleId field of 'pause' and 'temperature' steps.
  //
  // Bypass dependent field changes, do not use handleFormChange
  if (hasTemperatureModuleId && numOfModules === 1) {
    const moduleId = getNextDefaultTemperatureModuleId(
      savedStepForms,
      orderedStepIds,
      initialDeckSetup.modules
    )
    return {
      moduleId,
    }
  }

  return null
}

const _patchHeaterShakerModuleId = (args: {
  initialDeckSetup: InitialDeckSetup
  orderedStepIds: OrderedStepIdsState
  savedStepForms: SavedStepFormState
  stepType: StepType
}): FormUpdater => () => {
  const { initialDeckSetup, stepType } = args
  const numOfModules =
    Object.values(initialDeckSetup.modules).filter(
      module => module.type === HEATERSHAKER_MODULE_TYPE
    )?.length ?? 1
  const hasHeaterShakerModuleId =
    stepType === 'pause' || stepType === 'heaterShaker'

  // Auto-populate moduleId field of 'pause' and 'heaterShaker' steps.
  // Note, if both a temperature module and a heater shaker module are present, the pause form
  // will default to use the heater shaker
  // Bypass dependent field changes, do not use handleFormChange
  if (hasHeaterShakerModuleId && numOfModules === 1) {
    const moduleId =
      getModuleOnDeckByType(initialDeckSetup, HEATERSHAKER_MODULE_TYPE)?.id ??
      null
    if (moduleId != null) {
      return {
        moduleId,
      }
    }
  }

  return null
}

const _patchThermocyclerFields = (args: {
  initialDeckSetup: InitialDeckSetup
  stepType: StepType
  robotStateTimeline: Timeline
}): FormUpdater => () => {
  const { initialDeckSetup, stepType, robotStateTimeline } = args

  if (stepType !== 'thermocycler') {
    return null
  }

  const moduleId = getNextDefaultThermocyclerModuleId(initialDeckSetup.modules)
  const lastRobotState: RobotState | null | undefined = last(
    robotStateTimeline.timeline
  )?.robotState
  // @ts-expect-error(sa, 2021-05-26): module id might be null, need to type narrow
  const moduleState = lastRobotState?.modules[moduleId]?.moduleState

  if (moduleState && moduleState.type === THERMOCYCLER_MODULE_TYPE) {
    return {
      moduleId,
      blockIsActive: moduleState.blockTargetTemp !== null,
      blockTargetTemp: moduleState.blockTargetTemp,
      lidIsActive: moduleState.lidTargetTemp !== null,
      lidTargetTemp: moduleState.lidTargetTemp,
      lidOpen: moduleState.lidOpen,
    }
  }

  // if there's no last robot state (eg upstream errors), still should return moduleId
  return {
    moduleId,
  }
}

export const createPresavedStepForm = ({
  initialDeckSetup,
  labwareEntities,
  orderedStepIds,
  pipetteEntities,
  savedStepForms,
  stepId,
  stepType,
  robotStateTimeline,
  additionalEquipmentEntities,
}: CreatePresavedStepFormArgs): FormData => {
  const formData = createBlankForm({
    stepId,
    stepType,
  })

  const updateDefaultDropTip = _patchDefaultDropTipLocation({
    labwareEntities,
    pipetteEntities,
    additionalEquipmentEntities,
  })

  const updateDefaultLabwareLocations = _patchDefaultLabwareLocations({
    labwareEntities,
    pipetteEntities,
    stepType,
  })

  const updateDefaultPipette = _patchDefaultPipette({
    initialDeckSetup,
    labwareEntities,
    orderedStepIds,
    pipetteEntities,
    savedStepForms,
  })

  const updateMagneticModuleId = _patchDefaultMagnetFields({
    initialDeckSetup,
    orderedStepIds,
    savedStepForms,
    stepType,
  })

  const updateTemperatureModuleId = _patchTemperatureModuleId({
    initialDeckSetup,
    orderedStepIds,
    savedStepForms,
    stepType,
  })

  const updateHeaterShakerModuleId = _patchHeaterShakerModuleId({
    initialDeckSetup,
    orderedStepIds,
    savedStepForms,
    stepType,
  })

  const updateThermocyclerFields = _patchThermocyclerFields({
    initialDeckSetup,
    stepType,
    robotStateTimeline,
  })

  // finally, compose and apply all the updaters in order,
  // passing the applied result from one updater as the input of the next
  return [
    updateDefaultPipette,
    updateDefaultDropTip,
    updateTemperatureModuleId,
    updateThermocyclerFields,
    updateHeaterShakerModuleId,
    updateMagneticModuleId,
    updateDefaultLabwareLocations,
  ].reduce<FormData>(
    (acc, updater: FormUpdater) => {
      const updates = updater(acc)

      if (updates === null) {
        return acc
      }

      return { ...acc, ...updates }
    },
    { ...formData }
  )
}
