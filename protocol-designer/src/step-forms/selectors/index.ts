import isEqual from 'lodash/isEqual'
import mapValues from 'lodash/mapValues'
import reduce from 'lodash/reduce'
import isEmpty from 'lodash/isEmpty'
import { createSelector } from 'reselect'
import {
  getLabwareDisplayName,
  getLabwareDefURI,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
  getPipetteSpecsV2,
} from '@opentrons/shared-data'
import { TEMPERATURE_DEACTIVATED } from '@opentrons/step-generation'

import { INITIAL_DECK_SETUP_STEP_ID } from '../../constants'
import {
  getFormWarnings,
  getFormErrors,
  stepFormToArgs,
} from '../../steplist/formLevel'
import { getProfileFormErrors } from '../../steplist/formLevel/profileErrors'
import { getMoveLabwareFormErrors } from '../../steplist/formLevel/moveLabwareFormErrors'
import { getFieldErrors } from '../../steplist/fieldLevel'
import { getProfileItemsHaveErrors } from '../utils/getProfileItemsHaveErrors'
import * as featureFlagSelectors from '../../feature-flags/selectors'
import { denormalizePipetteEntities, getHydratedForm } from '../utils'
import { selectors as labwareDefSelectors } from '../../labware-defs'
import type { ComponentProps } from 'react'
import type { Selector } from 'reselect'
import type {
  AdditionalEquipmentEntities,
  NormalizedAdditionalEquipmentById,
  InvariantContext,
  LabwareEntity,
  LabwareEntities,
  ModuleEntities,
  PipetteEntities,
  LiquidEntities,
} from '@opentrons/step-generation'
import type { PipetteName, LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  InstrumentGroup,
  DropdownOption,
  Mount,
  InstrumentInfoProps,
} from '@opentrons/components'
import type { ProfileFormError } from '../../steplist/formLevel/profileErrors'
import type { LabwareDefByDefURI } from '../../labware-defs'
import type { FormWarning } from '../../steplist/formLevel'
import type { BaseState, DeckSlot } from '../../types'
import type {
  FormData,
  HydratedAbsorbanceReaderFormData,
  HydratedCommentFormData,
  HydratedFormData,
  HydratedHeaterShakerFormData,
  HydratedMagnetFormData,
  HydratedMixFormData,
  HydratedMoveLabwareFormData,
  HydratedMoveLiquidFormData,
  HydratedPauseFormData,
  HydratedTemperatureFormData,
  HydratedThermocyclerFormData,
  ProfileItem,
  StepIdType,
} from '../../form-types'
import type {
  StepArgsAndErrorsById,
  StepFormErrors,
} from '../../steplist/types'
import type {
  InitialDeckSetup,
  NormalizedLabwareById,
  NormalizedLabware,
  LabwareOnDeck,
  MagneticModuleState,
  ModuleOnDeck,
  ModulesForEditModulesCard,
  PipetteOnDeck,
  FormPipettesByMount,
  TemperatureModuleState,
  ThermocyclerModuleState,
  HeaterShakerModuleState,
  MagneticBlockState,
  AbsorbanceReaderState,
} from '../types'
import type {
  PresavedStepFormState,
  RootState,
  SavedStepFormState,
  BatchEditFormChangesState,
} from '../reducers'
import type { RootState as LabwareIngredRootState } from '../../labware-ingred/reducers'

const rootSelector = (state: BaseState): RootState => state.stepForms
const labwareIngredRootSelector = (state: BaseState): LabwareIngredRootState =>
  state.labwareIngred

export const getPresavedStepForm = (state: BaseState): PresavedStepFormState =>
  rootSelector(state).presavedStepForm
export const getCurrentFormIsPresaved: Selector<
  BaseState,
  boolean
> = createSelector(
  getPresavedStepForm,
  presavedStepForm => presavedStepForm != null
)

const _getNormalizedLiquidById: Selector<
  BaseState,
  LiquidEntities
> = createSelector(labwareIngredRootSelector, state => state.ingredients)

export const getLiquidEntities: Selector<
  BaseState,
  LiquidEntities
> = createSelector(
  _getNormalizedLiquidById,
  normalizedLiquidById => normalizedLiquidById
)

// NOTE Ian 2019-04-15: outside of this file, you probably only care about
// the labware entity in its denormalized representation, in which case you ought
// to use `getLabwareEntities` instead.
// `_getNormalizedLabwareById` is intended for uses tied to the NormalizedLabware type
const _getNormalizedLabwareById: Selector<
  BaseState,
  NormalizedLabwareById
> = createSelector(rootSelector, state => state.labwareInvariantProperties)

function _hydrateLabwareEntity(
  l: NormalizedLabware,
  labwareId: string,
  defsByURI: LabwareDefByDefURI
): LabwareEntity {
  const def = defsByURI[l.labwareDefURI]
  console.assert(
    def,
    `could not hydrate labware ${labwareId}, missing def for URI ${l.labwareDefURI}`
  )
  return { ...l, id: labwareId, def }
}

export const getLabwareEntities: Selector<
  BaseState,
  LabwareEntities
> = createSelector(
  _getNormalizedLabwareById,
  labwareDefSelectors.getLabwareDefsByURI,
  (normalizedLabwareById, labwareDefs) =>
    mapValues(normalizedLabwareById, (l: NormalizedLabware, id: string) =>
      _hydrateLabwareEntity(l, id, labwareDefs)
    )
)
// Special version of `getLabwareEntities` selector for use in step-forms reducers
export const _getLabwareEntitiesRootState: (
  arg0: RootState
) => LabwareEntities = createSelector(
  rs => rs.labwareInvariantProperties,
  labwareDefSelectors._getLabwareDefsByIdRootState,
  (normalizedLabwareById, labwareDefs) =>
    mapValues(normalizedLabwareById, (l: NormalizedLabware, id: string) =>
      _hydrateLabwareEntity(l, id, labwareDefs)
    )
)
// Special version of `getModuleEntities` selector for use in step-forms reducers
export const _getModuleEntitiesRootState: (
  arg: RootState
) => ModuleEntities = rs => rs.moduleInvariantProperties
export const getModuleEntities: Selector<
  BaseState,
  ModuleEntities
> = createSelector(rootSelector, _getModuleEntitiesRootState)
// Special version of `getPipetteEntities` selector for use in step-forms reducers
export const _getPipetteEntitiesRootState: (
  arg: RootState
) => PipetteEntities = createSelector(
  rs => rs.pipetteInvariantProperties,
  labwareDefSelectors._getLabwareDefsByIdRootState,
  denormalizePipetteEntities
)
// Special version of `getAdditionalEquipmentEntities` selector for use in step-forms reducers
export const _getAdditionalEquipmentEntitiesRootState: (
  arg: RootState
) => AdditionalEquipmentEntities = rs =>
  rs.additionalEquipmentInvariantProperties
export const getAdditionalEquipmentEntities: Selector<
  BaseState,
  AdditionalEquipmentEntities
> = createSelector(rootSelector, _getAdditionalEquipmentEntitiesRootState)

export const getPipetteEntities: Selector<
  BaseState,
  PipetteEntities
> = createSelector(rootSelector, _getPipetteEntitiesRootState)

export const _getAdditionalEquipmentRootState: (
  arg: RootState
) => NormalizedAdditionalEquipmentById = rs =>
  rs.additionalEquipmentInvariantProperties

export const getAdditionalEquipment: Selector<
  BaseState,
  NormalizedAdditionalEquipmentById
> = createSelector(rootSelector, _getAdditionalEquipmentRootState)

const _getInitialDeckSetupStepFormRootState: (
  arg: RootState
) => FormData = rs => rs.savedStepForms[INITIAL_DECK_SETUP_STEP_ID]

export const getInitialDeckSetupStepForm: Selector<
  BaseState,
  FormData
> = createSelector(rootSelector, _getInitialDeckSetupStepFormRootState)
const MAGNETIC_MODULE_INITIAL_STATE: MagneticModuleState = {
  type: MAGNETIC_MODULE_TYPE,
  engaged: false,
}
const TEMPERATURE_MODULE_INITIAL_STATE: TemperatureModuleState = {
  type: TEMPERATURE_MODULE_TYPE,
  status: TEMPERATURE_DEACTIVATED,
  targetTemperature: null,
}
const THERMOCYCLER_MODULE_INITIAL_STATE: ThermocyclerModuleState = {
  type: THERMOCYCLER_MODULE_TYPE,
  blockTargetTemp: null,
  lidTargetTemp: null,
  lidOpen: null,
}
const HEATERSHAKER_MODULE_INITIAL_STATE: HeaterShakerModuleState = {
  type: HEATERSHAKER_MODULE_TYPE,
  targetTemp: null,
  targetSpeed: null,
  latchOpen: null,
}
const MAGNETIC_BLOCK_INITIAL_STATE: MagneticBlockState = {
  type: MAGNETIC_BLOCK_TYPE,
}
const ABSORBANCE_READER_INITIAL_STATE: AbsorbanceReaderState = {
  type: ABSORBANCE_READER_TYPE,
  lidOpen: null,
  initialization: null,
}

const _getInitialDeckSetup = (
  initialSetupStep: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities,
  moduleEntities: ModuleEntities,
  additionalEquipmentEntities: AdditionalEquipmentEntities
): InitialDeckSetup => {
  console.assert(
    initialSetupStep && initialSetupStep.stepType === 'manualIntervention',
    'expected initial deck setup step to be "manualIntervention" step'
  )

  const labwareLocations =
    (initialSetupStep && initialSetupStep.labwareLocationUpdate) || {}
  const moduleLocations =
    (initialSetupStep && initialSetupStep.moduleLocationUpdate) || {}
  const pipetteLocations =
    (initialSetupStep && initialSetupStep.pipetteLocationUpdate) || {}

  // filtering only the additionalEquipmentEntities that are rendered on the deck
  // which for now is wasteChute, trashBin, and stagingArea
  const additionalEquipmentEntitiesOnDeck = Object.values(
    additionalEquipmentEntities
  ).reduce((aeEntities: AdditionalEquipmentEntities, ae) => {
    if (
      ae.name === 'wasteChute' ||
      ae.name === 'stagingArea' ||
      ae.name === 'trashBin'
    ) {
      aeEntities[ae.id] = ae
    }
    return aeEntities
  }, {})

  return {
    labware: mapValues<Record<DeckSlot, string>, LabwareOnDeck>(
      labwareLocations as Record<DeckSlot, string>,
      (slot: DeckSlot, labwareId: string): LabwareOnDeck => {
        return {
          slot,
          ...labwareEntities[labwareId],
        }
      }
    ),
    modules: mapValues<Record<DeckSlot, string>, ModuleOnDeck>(
      moduleLocations as Record<DeckSlot, string>,
      // @ts-expect-error Flex stacker not yet supported in PD
      (slot: DeckSlot, moduleId: string): ModuleOnDeck => {
        const moduleEntity = moduleEntities[moduleId]

        switch (moduleEntity.type) {
          case MAGNETIC_MODULE_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: MAGNETIC_MODULE_TYPE,
              slot,
              moduleState: MAGNETIC_MODULE_INITIAL_STATE,
            }
          case TEMPERATURE_MODULE_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: TEMPERATURE_MODULE_TYPE,
              slot,
              moduleState: TEMPERATURE_MODULE_INITIAL_STATE,
            }
          case THERMOCYCLER_MODULE_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: THERMOCYCLER_MODULE_TYPE,
              slot,
              moduleState: THERMOCYCLER_MODULE_INITIAL_STATE,
            }
          case HEATERSHAKER_MODULE_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: HEATERSHAKER_MODULE_TYPE,
              slot,
              moduleState: HEATERSHAKER_MODULE_INITIAL_STATE,
            }
          case MAGNETIC_BLOCK_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: MAGNETIC_BLOCK_TYPE,
              slot,
              moduleState: MAGNETIC_BLOCK_INITIAL_STATE,
            }
          case ABSORBANCE_READER_TYPE:
            return {
              id: moduleEntity.id,
              model: moduleEntity.model,
              type: ABSORBANCE_READER_TYPE,
              slot,
              moduleState: ABSORBANCE_READER_INITIAL_STATE,
            }
        }
      }
    ),
    pipettes: mapValues<{}, PipetteOnDeck>(
      pipetteLocations as Record<Mount, string>,
      (mount: Mount, pipetteId: string): PipetteOnDeck => {
        return { mount, ...pipetteEntities[pipetteId] }
      }
    ),
    additionalEquipmentOnDeck: additionalEquipmentEntitiesOnDeck,
  }
}

export const getInitialDeckSetup: Selector<
  BaseState,
  InitialDeckSetup
> = createSelector(
  getInitialDeckSetupStepForm,
  getLabwareEntities,
  getPipetteEntities,
  getModuleEntities,
  getAdditionalEquipment,
  _getInitialDeckSetup
)
// Special version of `getLabwareEntities` selector for use in step-forms reducers
export const _getInitialDeckSetupRootState: (
  arg0: RootState
) => InitialDeckSetup = createSelector(
  _getInitialDeckSetupStepFormRootState,
  _getLabwareEntitiesRootState,
  _getPipetteEntitiesRootState,
  _getModuleEntitiesRootState,
  _getAdditionalEquipmentRootState,
  _getInitialDeckSetup
)
export const getPermittedTipracks: Selector<
  BaseState,
  string[]
> = createSelector(getInitialDeckSetup, initialDeckSetup =>
  reduce(
    initialDeckSetup.pipettes,
    (acc: string[], pipette: PipetteOnDeck) => {
      return pipette.tiprackDefURI ? [...acc, ...pipette.tiprackDefURI] : acc
    },
    []
  )
)

function _getPipetteDisplayName(name: PipetteName): string {
  const pipetteSpecs = getPipetteSpecsV2(name)
  if (!pipetteSpecs) return 'Unknown Pipette'
  return pipetteSpecs.displayName
}

function _getPipettesSame(
  pipettesOnDeck: InitialDeckSetup['pipettes']
): boolean {
  const pipettes = Object.keys(pipettesOnDeck).map(id => {
    return pipettesOnDeck[id]
  })
  return pipettes[0]?.name === pipettes[1]?.name
}

// TODO: Ian 2018-12-20 EVENTUALLY make this `getEquippedPipetteOptionsForStepId`, so it tells you
// equipped pipettes per step id instead of always using initial deck setup
// (for when we support multiple deck setup steps)
export const getEquippedPipetteOptions: Selector<
  BaseState,
  DropdownOption[]
> = createSelector(getInitialDeckSetup, initialDeckSetup => {
  const pipettes = initialDeckSetup.pipettes

  const pipettesSame = _getPipettesSame(pipettes)

  return reduce(
    pipettes,
    (acc: DropdownOption[], pipette: PipetteOnDeck, id: string) => {
      const mountLabel = pipette.mount === 'left' ? '(L)' : '(R)'
      const nextOption = {
        name: pipettesSame
          ? `${_getPipetteDisplayName(pipette.name)} ${mountLabel}`
          : _getPipetteDisplayName(pipette.name),
        value: id,
      }
      return [...acc, nextOption]
    },
    []
  )
})
// Formats pipette data specifically for file page InstrumentGroup component
type PipettesForInstrumentGroup = ComponentProps<typeof InstrumentGroup>
export const getPipettesForInstrumentGroup: Selector<
  BaseState,
  PipettesForInstrumentGroup
> = createSelector(getInitialDeckSetup, initialDeckSetup =>
  reduce(
    initialDeckSetup.pipettes,
    (
      acc: PipettesForInstrumentGroup,
      pipetteOnDeck: PipetteOnDeck,
      pipetteId
    ) => {
      const pipetteSpec = pipetteOnDeck.spec
      const tiprackDefs = pipetteOnDeck.tiprackLabwareDef
      const pipetteForInstrumentGroup: InstrumentInfoProps = {
        mount: pipetteOnDeck.mount,
        pipetteSpecs: pipetteSpec,
        description: _getPipetteDisplayName(pipetteOnDeck.name),
        tiprackModels: tiprackDefs?.map((def: LabwareDefinition2) =>
          getLabwareDisplayName(def)
        ),
      }
      acc[pipetteOnDeck.mount] = pipetteForInstrumentGroup
      return acc
    },
    {}
  )
)
export const getPipettesForEditPipetteForm: Selector<
  BaseState,
  FormPipettesByMount
> = createSelector(getInitialDeckSetup, initialDeckSetup =>
  reduce<InitialDeckSetup['pipettes'], FormPipettesByMount>(
    initialDeckSetup.pipettes,
    (acc, pipetteOnDeck: PipetteOnDeck, id) => {
      const pipetteSpec = pipetteOnDeck.spec
      const tiprackDefs = pipetteOnDeck.tiprackLabwareDef
      if (!pipetteSpec || !tiprackDefs) return acc
      const pipetteForInstrumentGroup = {
        pipetteName: pipetteOnDeck.name,
        tiprackDefURI: tiprackDefs.map((def: LabwareDefinition2) =>
          getLabwareDefURI(def)
        ),
      }
      acc[pipetteOnDeck.mount] = pipetteForInstrumentGroup
      return acc
    },
    {
      left: {
        pipetteName: null,
        tiprackDefURI: null,
      },
      right: {
        pipetteName: null,
        tiprackDefURI: null,
      },
    }
  )
)
export const getModulesForEditModulesCard: Selector<
  BaseState,
  ModulesForEditModulesCard
> = createSelector(getInitialDeckSetup, initialDeckSetup =>
  reduce<InitialDeckSetup['modules'], ModulesForEditModulesCard>(
    initialDeckSetup.modules,
    (acc, moduleOnDeck: ModuleOnDeck, id) => {
      if (!acc[moduleOnDeck.type]) {
        acc[moduleOnDeck.type] = []
      }
      acc[moduleOnDeck.type]?.push(moduleOnDeck)
      return acc
    },
    {
      [MAGNETIC_MODULE_TYPE]: null,
      [TEMPERATURE_MODULE_TYPE]: null,
      [THERMOCYCLER_MODULE_TYPE]: null,
      [HEATERSHAKER_MODULE_TYPE]: null,
    }
  )
)
export const getUnsavedGroup: Selector<
  BaseState,
  StepIdType[]
> = createSelector(rootSelector, state => state.unsavedGroup)
export const getStepGroups: Selector<
  BaseState,
  Record<string, StepIdType[]>
> = createSelector(rootSelector, state => state.stepGroups)

export const getUnsavedForm: Selector<
  BaseState,
  FormData | null | undefined
> = createSelector(rootSelector, state => state.unsavedForm)
export const getOrderedStepIds: Selector<
  BaseState,
  StepIdType[]
> = createSelector(rootSelector, state => state.orderedStepIds)
export const getSavedStepForms: Selector<
  BaseState,
  SavedStepFormState
> = createSelector(rootSelector, state => state.savedStepForms)
const getOrderedSavedForms: Selector<BaseState, FormData[]> = createSelector(
  getOrderedStepIds,
  getSavedStepForms,
  (orderedStepIds, savedStepForms) => {
    return orderedStepIds
      .map(stepId => savedStepForms[stepId])
      .filter(form => form && form.id != null) // NOTE: for old protocols where stepId could === 0, need to do != null here
  }
)
export const getCurrentFormHasUnsavedChanges: Selector<
  BaseState,
  boolean
> = createSelector(
  getUnsavedForm,
  getSavedStepForms,
  (unsavedForm, savedStepForms) => {
    const id = unsavedForm?.id
    const savedForm = id != null ? savedStepForms[id] : null

    if (savedForm == null) {
      // nonexistent = no unsaved changes
      return false
    }

    return !isEqual(unsavedForm, savedForm)
  }
)
export const getBatchEditFieldChanges: Selector<
  BaseState,
  BatchEditFormChangesState
> = createSelector(rootSelector, state => state.batchEditFormChanges)
export const getBatchEditFormHasUnsavedChanges: Selector<
  BaseState,
  boolean
> = createSelector(getBatchEditFieldChanges, changes => !isEmpty(changes))

const _formLevelErrors = (hydratedForm: HydratedFormData): StepFormErrors => {
  return getFormErrors(hydratedForm.stepType, hydratedForm)
}

const _dynamicFieldFormErrors = (
  hydratedForm: HydratedFormData
): ProfileFormError[] => {
  return getProfileFormErrors(hydratedForm as HydratedThermocyclerFormData)
}

const _dynamicMoveLabwareFieldFormErrors = (
  hydratedForm: HydratedFormData,
  invariantContext: InvariantContext
): ProfileFormError[] => {
  return getMoveLabwareFormErrors(hydratedForm, invariantContext)
}

export const _hasFieldLevelErrors = (
  hydratedForm: HydratedFormData
): boolean => {
  const getHasFieldErrors = <T extends HydratedFormData>(form: T): boolean => {
    for (const fieldName of Object.keys(form) as Array<keyof T>) {
      const value = form[fieldName]

      if (
        form.stepType === 'thermocycler' &&
        fieldName === 'profileItemsById'
      ) {
        if (getProfileItemsHaveErrors(value as Record<string, ProfileItem>)) {
          return true
        }
      } else {
        // TODO: fieldName includes id, stepType, etc... this is weird #3161
        const fieldErrors = getFieldErrors(fieldName as string, value)

        if (fieldErrors && fieldErrors.length > 0) {
          return true
        }
      }
    }
    return false
  }

  switch (hydratedForm.stepType) {
    case 'thermocycler':
      return getHasFieldErrors(hydratedForm as HydratedThermocyclerFormData)

    case 'mix':
      return getHasFieldErrors(hydratedForm as HydratedMixFormData)

    case 'absorbanceReader':
      return getHasFieldErrors(hydratedForm as HydratedAbsorbanceReaderFormData)

    case 'comment':
      return getHasFieldErrors(hydratedForm as HydratedCommentFormData)

    case 'heaterShaker':
      return getHasFieldErrors(hydratedForm as HydratedHeaterShakerFormData)

    case 'magnet':
      return getHasFieldErrors(hydratedForm as HydratedMagnetFormData)

    case 'moveLabware':
      return getHasFieldErrors(hydratedForm as HydratedMoveLabwareFormData)

    case 'moveLiquid':
      return getHasFieldErrors(hydratedForm as HydratedMoveLiquidFormData)

    case 'pause':
      return getHasFieldErrors(hydratedForm as HydratedPauseFormData)

    case 'temperature':
      return getHasFieldErrors(hydratedForm as HydratedTemperatureFormData)

    default:
      return false
  }
}

export const _hasFormLevelErrors = (
  hydratedForm: HydratedFormData,
  invariantContext: InvariantContext
): boolean => {
  if (_formLevelErrors(hydratedForm).length > 0) return true

  if (
    hydratedForm.stepType === 'thermocycler' &&
    _dynamicFieldFormErrors(hydratedForm).length > 0
  ) {
    return true
  }

  if (
    hydratedForm.stepType === 'moveLabware' &&
    _dynamicMoveLabwareFieldFormErrors(hydratedForm, invariantContext).length >
      0
  ) {
    return true
  }
  return false
}
export const _formHasErrors = (
  hydratedForm: HydratedFormData,
  invariantContext: InvariantContext
): boolean => {
  return (
    _hasFieldLevelErrors(hydratedForm) ||
    _hasFormLevelErrors(hydratedForm, invariantContext)
  )
}
export const getInvariantContext: Selector<
  BaseState,
  InvariantContext
> = createSelector(
  getLabwareEntities,
  getModuleEntities,
  getPipetteEntities,
  getLiquidEntities,
  getAdditionalEquipmentEntities,
  featureFlagSelectors.getDisableModuleRestrictions,
  featureFlagSelectors.getAllowAllTipracks,
  (
    labwareEntities,
    moduleEntities,
    pipetteEntities,
    liquidEntities,
    additionalEquipmentEntities,
    disableModuleRestrictions,
    allowAllTipracks
  ) => ({
    labwareEntities,
    moduleEntities,
    pipetteEntities,
    liquidEntities,
    additionalEquipmentEntities,
    config: {
      OT_PD_ALLOW_ALL_TIPRACKS: Boolean(allowAllTipracks),
      OT_PD_DISABLE_MODULE_RESTRICTIONS: Boolean(disableModuleRestrictions),
    },
  })
)
export const getHydratedUnsavedForm: Selector<
  BaseState,
  HydratedFormData | null
> = createSelector(
  getUnsavedForm,
  getInvariantContext,
  (unsavedForm, invariantContext) => {
    if (unsavedForm == null) return null

    const hydratedForm = getHydratedForm(unsavedForm, invariantContext)

    return hydratedForm ?? null
  }
)
export const getDynamicFieldFormErrorsForUnsavedForm: Selector<
  BaseState,
  ProfileFormError[]
> = createSelector(
  getHydratedUnsavedForm,
  getInvariantContext,
  (hydratedForm, invariantContext) => {
    if (!hydratedForm) return []

    const errors = [
      ..._dynamicFieldFormErrors(hydratedForm),
      ..._dynamicMoveLabwareFieldFormErrors(hydratedForm, invariantContext),
    ]

    return errors
  }
)
export const getFormLevelErrorsForUnsavedForm: Selector<
  BaseState,
  StepFormErrors
> = createSelector(getHydratedUnsavedForm, hydratedForm => {
  if (!hydratedForm) return []

  const errors = _formLevelErrors(hydratedForm)

  return errors
})
export const getCurrentFormCanBeSaved: Selector<
  BaseState,
  boolean
> = createSelector(
  getHydratedUnsavedForm,
  getInvariantContext,
  (hydratedForm, invariantContext) => {
    if (!hydratedForm) return false
    return !_formHasErrors(hydratedForm, invariantContext)
  }
)
export const getArgsAndErrorsByStepId: Selector<
  BaseState,
  StepArgsAndErrorsById
> = createSelector(
  getOrderedSavedForms,
  getInvariantContext,
  (stepForms, contextualState) => {
    return reduce(
      stepForms,
      (acc, stepForm) => {
        const hydratedForm = getHydratedForm(stepForm, contextualState)

        const errors = _formHasErrors(hydratedForm, contextualState)
        const nextStepData = !errors
          ? {
              stepArgs: stepFormToArgs(hydratedForm),
            }
          : {
              errors,
              stepArgs: null,
            }
        return { ...acc, [stepForm.id]: nextStepData }
      },
      {}
    )
  }
)
export const getUnsavedFormIsPristineSetTempForm: Selector<
  BaseState,
  boolean
> = createSelector(
  getUnsavedForm,
  getCurrentFormIsPresaved,
  (unsavedForm, isPresaved) => {
    const isSetTempForm =
      unsavedForm?.stepType === 'temperature' &&
      unsavedForm?.targetTemperature != null
    return isPresaved && isSetTempForm
  }
)

export const getUnsavedFormIsPristineHeaterShakerForm: Selector<
  BaseState,
  boolean
> = createSelector(
  getUnsavedForm,
  getCurrentFormIsPresaved,
  (unsavedForm, isPresaved) => {
    const isSetHsTempForm =
      unsavedForm?.stepType === 'heaterShaker' &&
      unsavedForm?.targetHeaterShakerTemperature != null

    return isPresaved && isSetHsTempForm
  }
)
export const getFormLevelWarningsForUnsavedForm: Selector<
  BaseState,
  FormWarning[]
> = createSelector(
  getUnsavedForm,
  getInvariantContext,
  (unsavedForm, contextualState) => {
    if (!unsavedForm) return []

    const hydratedForm = getHydratedForm(unsavedForm, contextualState)

    return getFormWarnings(unsavedForm.stepType, hydratedForm)
  }
)
export const getFormLevelWarningsPerStep: Selector<
  BaseState,
  Record<string, FormWarning[]>
> = createSelector(
  getSavedStepForms,
  getInvariantContext,
  (forms, contextualState) =>
    mapValues(forms, (form, stepId) => {
      if (!form) return []

      const hydratedForm = getHydratedForm(form, contextualState)

      return getFormWarnings(form.stepType, hydratedForm)
    })
)
