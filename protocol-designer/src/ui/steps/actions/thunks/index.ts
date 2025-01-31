import last from 'lodash/last'
import {
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import {
  getUnsavedForm,
  getUnsavedFormIsPristineSetTempForm,
  getUnsavedFormIsPristineHeaterShakerForm,
  getOrderedStepIds,
  getInitialDeckSetup,
} from '../../../../step-forms/selectors'
import { changeFormInput } from '../../../../steplist/actions/actions'
import { PRESAVED_STEP_ID } from '../../../../steplist/types'
import { PAUSE_UNTIL_TEMP } from '../../../../constants'
import { uuid } from '../../../../utils'
import { getMultiSelectLastSelected, getSelectedStepId } from '../../selectors'
import { addStep, selectDropdownItem } from '../actions'
import {
  actions as tutorialActions,
  selectors as tutorialSelectors,
} from '../../../../tutorial'
import * as fileDataSelectors from '../../../../file-data/selectors'
import type { StepType, StepIdType, FormData } from '../../../../form-types'
import type { ThunkAction } from '../../../../types'
import type {
  DuplicateStepAction,
  DuplicateMultipleStepsAction,
  SelectMultipleStepsAction,
} from '../types'

export const addAndSelectStep: (arg: {
  stepType: StepType
}) => ThunkAction<any> = payload => (dispatch, getState) => {
  const robotStateTimeline = fileDataSelectors.getRobotStateTimeline(getState())
  const initialDeckSetup = getInitialDeckSetup(getState())
  const { modules, labware } = initialDeckSetup
  dispatch(
    addStep({
      stepType: payload.stepType,
      robotStateTimeline,
    })
  )
  if (payload.stepType === 'thermocycler') {
    const tcId = Object.entries(modules).find(
      ([key, module]) => module.type === THERMOCYCLER_MODULE_TYPE
    )?.[0]
    if (tcId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: tcId,
            text: 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  } else if (payload.stepType === 'magnet') {
    const magId = Object.entries(modules).find(
      ([key, module]) => module.type === MAGNETIC_MODULE_TYPE
    )?.[0]
    if (magId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: magId,
            text: 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  } else if (payload.stepType === 'temperature') {
    const temperatureModules = Object.entries(modules).filter(
      ([key, module]) => module.type === TEMPERATURE_MODULE_TYPE
    )
    //  only set selected temperature module if only 1 type is on deck
    const tempId =
      temperatureModules.length === 1 ? temperatureModules[0][0] : null
    if (tempId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: tempId,
            text: 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  } else if (payload.stepType === 'heaterShaker') {
    const hsModules = Object.entries(modules).filter(
      ([key, module]) => module.type === HEATERSHAKER_MODULE_TYPE
    )
    //  only set selected h-s module if only 1 type is on deck
    const hsId = hsModules.length === 1 ? hsModules[0][0] : null
    if (hsId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: hsId,
            text: 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  } else if (payload.stepType === 'mix' || payload.stepType === 'moveLiquid') {
    const labwares = Object.entries(labware).filter(
      ([key, lw]) =>
        !lw.def.parameters.isTiprack &&
        !lw.def.allowedRoles?.includes('adapter') &&
        !lw.def.allowedRoles?.includes('lid')
    )
    //  only set selected labware if only 1 available labware is on deck
    const labwareId = labwares.length === 1 ? labwares[0][0] : null
    if (labwareId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: labwareId,
            text: payload.stepType === 'moveLiquid' ? 'Source' : 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  } else if (payload.stepType === 'moveLabware') {
    const labwares = Object.entries(labware).filter(
      ([key, lw]) => !lw.def.allowedRoles?.includes('adapter')
    )
    //  only set selected labware if only 1 available labware/tiprack/lid is on deck
    const labwareId = labwares.length === 1 ? labwares[0][0] : null
    if (labwareId != null) {
      dispatch(
        selectDropdownItem({
          selection: {
            id: labwareId,
            text: 'Selected',
            field: '1',
          },
          mode: 'add',
        })
      )
    }
  }
}
export interface ReorderSelectedStepAction {
  type: 'REORDER_SELECTED_STEP'
  payload: {
    delta: number
    stepId: StepIdType
  }
}
export const reorderSelectedStep: (
  delta: number
) => ThunkAction<ReorderSelectedStepAction> = delta => (dispatch, getState) => {
  const stepId = getSelectedStepId(getState())

  if (stepId != null) {
    dispatch({
      type: 'REORDER_SELECTED_STEP',
      payload: {
        delta,
        stepId,
      },
    })
  }
}
export const duplicateStep: (
  stepId: StepIdType
) => ThunkAction<DuplicateStepAction> = stepId => (dispatch, getState) => {
  const duplicateStepId = uuid()

  if (stepId != null) {
    dispatch({
      type: 'DUPLICATE_STEP',
      payload: {
        stepId,
        duplicateStepId,
      },
    })
  }
}
export const duplicateMultipleSteps: (
  stepIds: StepIdType[]
) => ThunkAction<
  DuplicateMultipleStepsAction | SelectMultipleStepsAction
> = stepIds => (dispatch, getState) => {
  const orderedStepIds = getOrderedStepIds(getState())
  const lastSelectedItemId = getMultiSelectLastSelected(getState())
  // @ts-expect-error(sa, 2021-6-15): lastSelectedItemId might be null, which you cannot pass to indexOf
  const indexOfLastSelected = orderedStepIds.indexOf(lastSelectedItemId)
  stepIds.sort((a, b) => orderedStepIds.indexOf(a) - orderedStepIds.indexOf(b))
  const duplicateIdsZipped = stepIds.map(stepId => ({
    stepId: stepId,
    duplicateStepId: uuid(),
  }))
  const duplicateIds = duplicateIdsZipped.map(
    ({ duplicateStepId }) => duplicateStepId
  )
  const duplicateMultipleStepsAction: DuplicateMultipleStepsAction = {
    type: 'DUPLICATE_MULTIPLE_STEPS',
    payload: {
      steps: duplicateIdsZipped,
      indexToInsert: indexOfLastSelected + 1,
    },
  }
  const selectMultipleStepsAction: SelectMultipleStepsAction = {
    type: 'SELECT_MULTIPLE_STEPS',
    payload: {
      stepIds: duplicateIds,
      // @ts-expect-error(sa, 2021-6-15): last might return undefined
      lastSelected: last(duplicateIds),
    },
  }
  dispatch(duplicateMultipleStepsAction)
  dispatch(selectMultipleStepsAction)
}
export const SAVE_STEP_FORM: 'SAVE_STEP_FORM' = 'SAVE_STEP_FORM'
export interface SaveStepFormAction {
  type: typeof SAVE_STEP_FORM
  payload: FormData
}
export const _saveStepForm = (form: FormData): SaveStepFormAction => {
  // if presaved, transform pseudo ID to real UUID upon save
  const payload = form.id === PRESAVED_STEP_ID ? { ...form, id: uuid() } : form
  return {
    type: SAVE_STEP_FORM,
    payload,
  }
}

/** take unsavedForm state and put it into the payload */
export const saveStepForm: () => ThunkAction<any> = () => (
  dispatch,
  getState
) => {
  const initialState = getState()
  const unsavedForm = getUnsavedForm(initialState)

  // this check is only for Flow. At this point, unsavedForm should always be populated
  if (!unsavedForm) {
    console.assert(
      false,
      'Tried to saveStepForm with falsey unsavedForm. This should never be able to happen.'
    )
    return
  }

  if (tutorialSelectors.shouldShowCoolingHint(initialState)) {
    dispatch(tutorialActions.addHint('thermocycler_lid_passive_cooling'))
  }

  if (tutorialSelectors.shouldShowWasteChuteHint(initialState)) {
    dispatch(tutorialActions.addHint('waste_chute_warning'))
  }

  // save the form
  dispatch(_saveStepForm(unsavedForm))
}

/** "power action", mimicking saving the never-saved "set temperature X" step,
 ** then creating and saving a "pause until temp X" step */
export const saveSetTempFormWithAddedPauseUntilTemp: () => ThunkAction<any> = () => (
  dispatch,
  getState
) => {
  const initialState = getState()
  const unsavedSetTemperatureForm = getUnsavedForm(initialState)
  const isPristineSetTempForm = getUnsavedFormIsPristineSetTempForm(
    initialState
  )

  // this check is only for Flow. At this point, unsavedForm should always be populated
  if (!unsavedSetTemperatureForm) {
    console.assert(
      false,
      'Tried to saveSetTempFormWithAddedPauseUntilTemp with falsey unsavedForm. This should never be able to happen.'
    )
    return
  }

  const { id } = unsavedSetTemperatureForm

  if (!isPristineSetTempForm) {
    // this check should happen upstream (before dispatching saveSetTempFormWithAddedPauseUntilTemp in the first place)
    console.assert(
      false,
      `tried to saveSetTempFormWithAddedPauseUntilTemp but form ${id} is not a pristine set temp form`
    )
    return
  }

  const temperature = unsavedSetTemperatureForm?.targetTemperature

  console.assert(
    temperature != null && temperature !== '',
    `tried to auto-add a pause until temp, but targetTemperature is missing: ${temperature}`
  )
  // save the set temperature step form that is currently open
  dispatch(_saveStepForm(unsavedSetTemperatureForm))
  // add a new pause step form
  dispatch(
    addStep({
      stepType: 'pause',
      robotStateTimeline: fileDataSelectors.getRobotStateTimeline(getState()),
    })
  )
  // NOTE: fields should be set one at a time b/c dependentFieldsUpdate fns can filter out inputs
  // contingent on other inputs (eg changing the pauseAction radio button may clear the pauseTemperature).
  dispatch(
    changeFormInput({
      update: {
        pauseAction: PAUSE_UNTIL_TEMP,
      },
    })
  )
  const tempertureModuleId = unsavedSetTemperatureForm?.moduleId
  dispatch(
    changeFormInput({
      update: {
        moduleId: tempertureModuleId,
      },
    })
  )
  dispatch(
    changeFormInput({
      update: {
        pauseTemperature: temperature,
      },
    })
  )
  // finally save the new pause form
  const unsavedPauseForm = getUnsavedForm(getState())

  // this conditional is for Flow, the unsaved form should always exist
  if (unsavedPauseForm != null) {
    dispatch(_saveStepForm(unsavedPauseForm))
  } else {
    console.assert(
      false,
      'could not auto-save pause form, getUnsavedForm returned'
    )
  }
}

export const saveHeaterShakerFormWithAddedPauseUntilTemp: () => ThunkAction<any> = () => (
  dispatch,
  getState
) => {
  const initialState = getState()
  const unsavedHeaterShakerForm = getUnsavedForm(initialState)
  const isPristineSetHeaterShakerTempForm = getUnsavedFormIsPristineHeaterShakerForm(
    initialState
  )

  if (!unsavedHeaterShakerForm) {
    console.assert(
      false,
      'Tried to saveSetHeaterShakerTempFormWithAddedPauseUntilTemp with falsey unsavedForm. This should never be able to happen.'
    )
    return
  }

  const { id } = unsavedHeaterShakerForm

  if (!isPristineSetHeaterShakerTempForm) {
    console.assert(
      false,
      `tried to saveSetHeaterShakerTempFormWithAddedPauseUntilTemp but form ${id} is not a pristine set heater shaker temp form`
    )
    return
  }

  const temperature = unsavedHeaterShakerForm?.targetHeaterShakerTemperature

  console.assert(
    temperature != null && temperature !== '',
    `tried to auto-add a pause until temp, but targetHeaterShakerTemperature is missing: ${temperature}`
  )
  dispatch(_saveStepForm(unsavedHeaterShakerForm))
  dispatch(
    addStep({
      stepType: 'pause',
      robotStateTimeline: fileDataSelectors.getRobotStateTimeline(getState()),
    })
  )
  dispatch(
    changeFormInput({
      update: {
        pauseAction: PAUSE_UNTIL_TEMP,
      },
    })
  )
  const heaterShakerModuleId = unsavedHeaterShakerForm.moduleId
  dispatch(
    changeFormInput({
      update: {
        moduleId: heaterShakerModuleId,
      },
    })
  )

  dispatch(
    changeFormInput({
      update: {
        pauseTemperature: temperature,
      },
    })
  )
  const unsavedPauseForm = getUnsavedForm(getState())

  if (unsavedPauseForm != null) {
    dispatch(_saveStepForm(unsavedPauseForm))
  } else {
    console.assert(
      false,
      'could not auto-save pause form, getUnsavedForm returned'
    )
  }
}
