// @flow
import {combineReducers} from 'redux'
import {handleActions} from 'redux-actions'
import type {FileError} from './types'

// Keep track of file upload errors
const fileErrors = handleActions({
  FILE_ERRORS: (state, action: {payload: FileError}) => action.payload,
}, null)

// NOTE: whenever we add or change any of the action types that indicate
// "changes to the protocol", those action types need to be updated here.
const unsavedChanges = (state: boolean = false, action: {type: string}): boolean => {
  switch (action.type) {
    case 'LOAD_FILE':
    case 'SAVE_PROTOCOL_FILE':
      return false
    case 'CREATE_NEW_PROTOCOL':
    case 'DISMISS_FORM_WARNING':
    case 'DISMISS_TIMELINE_WARNING':
    case 'CREATE_CONTAINER':
    case 'DELETE_CONTAINER':
    case 'CHANGE_SAVED_STEP_FORM':
    case 'MOVE_LABWARE':
    case 'SWAP_SLOT_CONTENTS':
    case 'RENAME_LABWARE':
    case 'DELETE_LIQUID_GROUP':
    case 'EDIT_LIQUID_GROUP':
    case 'REMOVE_WELLS_CONTENTS':
    case 'SET_WELL_CONTENTS':
    case 'ADD_STEP':
    case 'DELETE_STEP':
    case 'SAVE_STEP_FORM':
    case 'SAVE_FILE_METADATA':
      return true
    default:
      return state
  }
}

export const _allReducers = {
  fileErrors,
  unsavedChanges,
}

export type RootState = {
  fileErrors: FileError,
  unsavedChanges: boolean,
}

const rootReducer = combineReducers(_allReducers)

export default rootReducer
