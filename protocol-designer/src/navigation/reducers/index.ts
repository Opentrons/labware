import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import type { Reducer } from 'redux'
import type { BaseState, Action } from '../../types'
import type { ToggleNewProtocolModalAction } from '../actions'

const newProtocolModal: Reducer<boolean, any> = handleActions(
  {
    // @ts-expect-error(sa, 2021-6-21): cannot use string literals as action type
    // TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
    TOGGLE_NEW_PROTOCOL_MODAL: (
      state,
      action: ToggleNewProtocolModalAction
    ): boolean => action.payload,
    CREATE_NEW_PROTOCOL: () => false,
  },
  false
)
export const _allReducers = {
  newProtocolModal,
}
export interface RootState {
  newProtocolModal: boolean
}
export const rootReducer: Reducer<RootState, Action> = combineReducers(
  _allReducers
)
export const rootSelector = (state: BaseState): RootState => state.navigation
