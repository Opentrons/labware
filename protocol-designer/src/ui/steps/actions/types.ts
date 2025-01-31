import type { Timeline } from '@opentrons/step-generation'
import type { StepIdType, StepType } from '../../../form-types'
import type { TerminalItemId, SubstepIdentifier } from '../../../steplist/types'
interface AddStepPayload {
  id: string
  stepType: StepType
}
export interface AddStepAction {
  type: 'ADD_STEP'
  payload: AddStepPayload
  meta: {
    robotStateTimeline: Timeline
  }
}
export interface ClearWellSelectionLabwareKeyAction {
  type: 'CLEAR_WELL_SELECTION_LABWARE_KEY'
  payload: null
}
interface DuplicateStepPayload {
  stepId: StepIdType
  duplicateStepId: StepIdType
}
export interface DuplicateStepAction {
  type: 'DUPLICATE_STEP'
  payload: DuplicateStepPayload
}
export interface DuplicateMultipleStepsAction {
  type: 'DUPLICATE_MULTIPLE_STEPS'
  payload: {
    steps: DuplicateStepPayload[]
    indexToInsert: number
  }
}

export type Mode = 'clear' | 'add'
export interface Selection {
  id: string | null
  text: string | null
  field?: '1' | '2'
}
export interface selectDropdownItemAction {
  type: 'SELECT_DROPDOWN_ITEM'
  payload: {
    selection: Selection | null
    mode: 'add' | 'clear'
  }
}
export interface hoverSelectionAction {
  type: 'HOVER_DROPDOWN_ITEM'
  payload: Selection
}
export interface HoverOnSubstepAction {
  type: 'HOVER_ON_SUBSTEP'
  payload: SubstepIdentifier
}
export interface ReorderSelectedStepAction {
  type: 'REORDER_SELECTED_STEP'
  payload: {
    delta: number
    stepId: StepIdType
  }
}
export interface ClearSelectedItemAction {
  type: 'CLEAR_SELECTED_ITEM'
}
export interface SelectTerminalItemAction {
  type: 'SELECT_TERMINAL_ITEM'
  payload: TerminalItemId
}
// TODO: Ian 2018-07-31 types aren't being inferred by ActionType in hoveredItem reducer...
export interface HoverOnStepAction {
  type: 'HOVER_ON_STEP'
  payload: StepIdType | null | undefined
}
export interface HoverOnTerminalItemAction {
  type: 'HOVER_ON_TERMINAL_ITEM'
  payload: TerminalItemId | null | undefined
}
export interface SetWellSelectionLabwareKeyAction {
  type: 'SET_WELL_SELECTION_LABWARE_KEY'
  payload: string | null | undefined
}
export interface SelectStepAction {
  type: 'SELECT_STEP'
  payload: StepIdType
}
export interface SelectMultipleStepsAction {
  type: 'SELECT_MULTIPLE_STEPS'
  payload: {
    stepIds: StepIdType[]
    lastSelected: StepIdType
  }
}

export interface SelectMultipleStepsForGroupAction {
  type: 'SELECT_MULTIPLE_STEPS_FOR_GROUP'
  payload: {
    stepIds: StepIdType[]
    lastSelected: StepIdType
  }
}
export type ViewSubstep = StepIdType | null
export interface ToggleViewSubstepAction {
  type: 'TOGGLE_VIEW_SUBSTEP'
  payload: ViewSubstep
}
