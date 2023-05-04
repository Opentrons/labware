import { BaseState, Action } from '../../types'
import { NavigateToPageAction, ToggleNewProtocolModalAction } from '../actions'
import { Page } from '../types'
import { Reducer, combineReducers } from 'redux'
import { handleActions } from 'redux-actions'

const page: Reducer<Page, any> = handleActions(
  {
    LOAD_FILE: (): Page => 'file-detail',
    CREATE_NEW_PROTOCOL: (): Page => 'file-detail',
    // @ts-expect-error(sa, 2021-6-21): cannot use string literals as action type
    // TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
    NAVIGATE_TO_PAGE: (state, action: NavigateToPageAction) => action.payload,
  },
  'file-splash'
)
// @ts-expect-error(sa, 2021-6-21): TS thinks this will only return false, even though TOGGLE_NEW_PROTOCOL_MODAL might yield true
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
  page,
  newProtocolModal,
}
export interface RootState {
  page: Page
  newProtocolModal: boolean
}
export const rootReducer: Reducer<RootState, Action> = combineReducers(
  _allReducers
)
export const rootSelector = (state: BaseState): RootState => state.navigation
