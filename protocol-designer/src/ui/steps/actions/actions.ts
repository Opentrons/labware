import last from 'lodash/last'
import { analyticsEvent } from '../../../analytics/actions'
import { PRESAVED_STEP_ID } from '../../../steplist/types'
import { selectors as stepFormSelectors } from '../../../step-forms'
import {
  DESELECT_ALL_STEPS_EVENT,
  EXIT_BATCH_EDIT_MODE_EVENT,
  SELECT_ALL_STEPS_EVENT,
} from '../../../analytics/constants'
import { getMultiSelectLastSelected } from '../selectors'
import { resetScrollElements } from '../utils'
import type { Timeline } from '@opentrons/step-generation'
import type { StepIdType, StepType } from '../../../form-types'
import type { GetState, ThunkAction, ThunkDispatch } from '../../../types'
import type { AnalyticsEvent } from '../../../analytics/mixpanel'
import type { AnalyticsEventAction } from '../../../analytics/actions'
import type { TerminalItemId, SubstepIdentifier } from '../../../steplist/types'
import type {
  AddStepAction,
  ClearWellSelectionLabwareKeyAction,
  HoverOnStepAction,
  HoverOnSubstepAction,
  HoverOnTerminalItemAction,
  hoverSelectionAction,
  Mode,
  selectDropdownItemAction,
  Selection,
  SelectMultipleStepsAction,
  SelectMultipleStepsForGroupAction,
  SelectStepAction,
  SelectTerminalItemAction,
  SetWellSelectionLabwareKeyAction,
  ToggleViewSubstepAction,
  ViewSubstep,
} from './types'

// adds an incremental integer ID for Step reducers.
// NOTE: if this is an "add step" directly performed by the user,
// addAndSelectStepWithHints is probably what you want
export const addStep = (args: {
  stepType: StepType
  robotStateTimeline: Timeline
}): AddStepAction => {
  return {
    type: 'ADD_STEP',
    payload: {
      stepType: args.stepType,
      id: PRESAVED_STEP_ID,
    },
    meta: {
      robotStateTimeline: args.robotStateTimeline,
    },
  }
}
export const hoverSelection = (args: Selection): hoverSelectionAction => ({
  type: 'HOVER_DROPDOWN_ITEM',
  payload: { id: args.id, text: args.text },
})
export const selectDropdownItem = (args: {
  selection: Selection | null
  mode: Mode
}): selectDropdownItemAction => ({
  type: 'SELECT_DROPDOWN_ITEM',
  payload: {
    selection:
      args.selection != null
        ? {
            id: args.selection.id,
            text: args.selection.text,
            field: args.selection.field,
          }
        : null,
    mode: args.mode,
  },
})

export const hoverOnSubstep = (
  payload: SubstepIdentifier
): HoverOnSubstepAction => ({
  type: 'HOVER_ON_SUBSTEP',
  payload: payload,
})
export const selectTerminalItem = (
  terminalId: TerminalItemId
): SelectTerminalItemAction => ({
  type: 'SELECT_TERMINAL_ITEM',
  payload: terminalId,
})
export const hoverOnStep = (
  stepId: StepIdType | null | undefined
): HoverOnStepAction => ({
  type: 'HOVER_ON_STEP',
  payload: stepId,
})
export const hoverOnTerminalItem = (
  terminalId: TerminalItemId | null | undefined
): HoverOnTerminalItemAction => ({
  type: 'HOVER_ON_TERMINAL_ITEM',
  payload: terminalId,
})
export const setWellSelectionLabwareKey = (
  labwareName: string | null | undefined
): SetWellSelectionLabwareKeyAction => ({
  type: 'SET_WELL_SELECTION_LABWARE_KEY',
  payload: labwareName,
})
export const clearWellSelectionLabwareKey = (): ClearWellSelectionLabwareKeyAction => ({
  type: 'CLEAR_WELL_SELECTION_LABWARE_KEY',
  payload: null,
})
export const resetSelectStep = (stepId: StepIdType): ThunkAction<any> => (
  dispatch: ThunkDispatch<any>,
  getState: GetState
) => {
  const selectStepAction: SelectStepAction = {
    type: 'SELECT_STEP',
    payload: stepId,
  }
  dispatch(selectStepAction)
  dispatch({
    type: 'POPULATE_FORM',
    payload: null,
  })
  dispatch({
    type: 'SELECT_DROPDOWN_ITEM',
    payload: {
      selection: {
        id: null,
        text: null,
      },
      mode: 'clear',
    },
  })
  resetScrollElements()
}

const setSelection = (
  formData: {
    [x: string]: any
    stepType: StepType
    id: string
  },
  dispatch: ThunkDispatch<any>
): void => {
  if (formData.stepType === 'moveLabware') {
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: { id: formData.labware, text: 'Selected', field: '1' },
        mode: 'add',
      },
    })
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: { id: formData.newLocation, text: 'Location', field: '2' },
        mode: 'add',
      },
    })
  } else if (formData.stepType === 'moveLiquid') {
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: {
          id: formData.aspirate_labware,
          text: 'Source',
          field: '1',
        },
        mode: 'add',
      },
    })
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: {
          id: formData.dispense_labware,
          text: 'Destination',
          field: '2',
        },
        mode: 'add',
      },
    })
  } else if (formData.stepType === 'mix') {
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: {
          id: formData.labware,
          text: 'Selected',
          field: '1',
        },
        mode: 'add',
      },
    })
  } else if (
    formData.stepType === 'heaterShaker' ||
    formData.stepType === 'temperature' ||
    formData.stepType === 'thermocycler' ||
    formData.stepType === 'magnet'
  ) {
    dispatch({
      type: 'SELECT_DROPDOWN_ITEM',
      payload: {
        selection: {
          id: formData.moduleId,
          text: 'Selected',
          field: '1',
        },
        mode: 'add',
      },
    })
  }
}

export const populateForm = (stepId: StepIdType): ThunkAction<any> => (
  dispatch: ThunkDispatch<any>,
  getState: GetState
) => {
  const state = getState()
  const formData = { ...stepFormSelectors.getSavedStepForms(state)[stepId] }
  dispatch({
    type: 'POPULATE_FORM',
    payload: formData,
  })
  setSelection(formData, dispatch)
  resetScrollElements()
}
export const selectStep = (stepId: StepIdType): ThunkAction<any> => (
  dispatch: ThunkDispatch<any>,
  getState: GetState
) => {
  const selectStepAction: SelectStepAction = {
    type: 'SELECT_STEP',
    payload: stepId,
  }
  dispatch(selectStepAction)
  const state = getState()
  const formData = { ...stepFormSelectors.getSavedStepForms(state)[stepId] }
  dispatch({
    type: 'POPULATE_FORM',
    payload: formData,
  })
  setSelection(formData, dispatch)
}
// NOTE(sa, 2020-12-11): this is a thunk so that we can populate the batch edit form with things later
export const selectMultipleSteps = (
  stepIds: StepIdType[],
  lastSelected: StepIdType
): ThunkAction<SelectMultipleStepsAction> => (
  dispatch: ThunkDispatch<any>,
  getState: GetState
) => {
  const selectStepAction: SelectMultipleStepsAction = {
    type: 'SELECT_MULTIPLE_STEPS',
    payload: {
      stepIds,
      lastSelected,
    },
  }
  dispatch(selectStepAction)
}
export const selectMultipleStepsForGroup = (
  stepIds: StepIdType[],
  lastSelected: StepIdType
): ThunkAction<SelectMultipleStepsForGroupAction> => (
  dispatch: ThunkDispatch<any>,
  getState: GetState
) => {
  const selectStepAction: SelectMultipleStepsForGroupAction = {
    type: 'SELECT_MULTIPLE_STEPS_FOR_GROUP',
    payload: {
      stepIds,
      lastSelected,
    },
  }
  dispatch(selectStepAction)
}
export const selectAllSteps = (): ThunkAction<
  SelectMultipleStepsAction | AnalyticsEventAction
> => (
  dispatch: ThunkDispatch<SelectMultipleStepsAction | AnalyticsEventAction>,
  getState: GetState
) => {
  const allStepIds = stepFormSelectors.getOrderedStepIds(getState())
  const selectStepAction: SelectMultipleStepsAction = {
    type: 'SELECT_MULTIPLE_STEPS',
    payload: {
      stepIds: allStepIds,
      // @ts-expect-error(sa, 2021-6-15): find could return undefined, need to null check PipetteSpecsV2
      lastSelected: last(allStepIds),
    },
  }
  dispatch(selectStepAction)
  // dispatch an analytics event to indicate all steps have been selected
  // because there is no 'SELECT_ALL_STEPS' action that middleware can catch
  const selectAllStepsEvent: AnalyticsEvent = {
    name: SELECT_ALL_STEPS_EVENT,
    properties: {},
  }
  dispatch(analyticsEvent(selectAllStepsEvent))
}
export const EXIT_BATCH_EDIT_MODE_BUTTON_PRESS: 'EXIT_BATCH_EDIT_MODE_BUTTON_PRESS' =
  'EXIT_BATCH_EDIT_MODE_BUTTON_PRESS'
export const deselectAllSteps = (
  meta?: typeof EXIT_BATCH_EDIT_MODE_BUTTON_PRESS
): ThunkAction<SelectStepAction | AnalyticsEventAction> => (
  dispatch: ThunkDispatch<SelectStepAction | AnalyticsEventAction>,
  getState: GetState
) => {
  const lastSelectedStepId = getMultiSelectLastSelected(getState())

  if (lastSelectedStepId) {
    const selectStepAction: SelectStepAction = {
      type: 'SELECT_STEP',
      payload: lastSelectedStepId,
    }
    dispatch(selectStepAction)
  } else {
    console.warn(
      'something went wrong, cannot deselect all steps if not in multi select mode'
    )
  }

  // dispatch an analytics event to indicate all steps have been deselected
  // because there is no 'DESELECT_ALL_STEPS'/'EXIT_BATCH_EDIT_MODE' action that middleware can catch
  if (meta === EXIT_BATCH_EDIT_MODE_BUTTON_PRESS) {
    // for analytics purposes we want to differentiate between
    // deselecting all, and using the "exit batch edit mode" button
    const exitBatchEditModeEvent: AnalyticsEvent = {
      name: EXIT_BATCH_EDIT_MODE_EVENT,
      properties: {},
    }
    dispatch(analyticsEvent(exitBatchEditModeEvent))
  } else {
    const deselectAllStepsEvent: AnalyticsEvent = {
      name: DESELECT_ALL_STEPS_EVENT,
      properties: {},
    }
    dispatch(analyticsEvent(deselectAllStepsEvent))
  }
}

export const toggleViewSubstep = (
  stepId: ViewSubstep
): ToggleViewSubstepAction => ({
  type: 'TOGGLE_VIEW_SUBSTEP',
  payload: stepId,
})
