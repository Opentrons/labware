import {
  ADD_STEPS_TO_GROUP,
  CLEAR_UNSAVED_GROUP,
  CREATE_GROUP,
  REMOVE_GROUP,
  SELECT_STEP_FOR_UNSAVED_GROUP,
} from '../reducers'

export interface RemoveGroupAction {
  type: typeof REMOVE_GROUP
  payload: { groupName: string }
}

export interface SaveGroupAction {
  type: typeof CREATE_GROUP
  payload: { groupName: string }
}
export interface AddStepToGroupAction {
  type: typeof ADD_STEPS_TO_GROUP
  payload: { groupName: string; stepIds: string[] }
}
export interface ClearGroupAction {
  type: typeof CLEAR_UNSAVED_GROUP
}
export interface SelectedStepForGroupAction {
  type: typeof SELECT_STEP_FOR_UNSAVED_GROUP
  payload: { stepId: string }
}

export const addStepToGroup = (
  args: AddStepToGroupAction['payload']
): AddStepToGroupAction => ({
  type: ADD_STEPS_TO_GROUP,
  payload: args,
})

export const createGroup = (
  args: SaveGroupAction['payload']
): SaveGroupAction => ({
  type: CREATE_GROUP,
  payload: args,
})

export const selectStepForUnsavedGroup = (
  args: SelectedStepForGroupAction['payload']
): SelectedStepForGroupAction => ({
  type: SELECT_STEP_FOR_UNSAVED_GROUP,
  payload: args,
})

export const clearUnsavedGroup = (): ClearGroupAction => ({
  type: CLEAR_UNSAVED_GROUP,
})

export const removeGroup = (
  args: RemoveGroupAction['payload']
): RemoveGroupAction => ({
  type: REMOVE_GROUP,
  payload: args,
})
