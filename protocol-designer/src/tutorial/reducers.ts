import { combineReducers } from 'redux'
import { handleActions } from 'redux-actions'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import type { Reducer } from 'redux'
import type { Action } from '../types'
import type { RehydratePersistedAction } from '../persist'
import type { AddHintAction, RemoveHintAction } from './actions'
import type { HintKey } from './index'

type HintReducerState = HintKey[]
const hints = handleActions<HintReducerState>(
  {
    //  @ts-expect-error
    ADD_HINT: (
      state: HintReducerState,
      action: AddHintAction
    ): HintReducerState => uniq([...state, action.payload.hintKey]),
  },
  []
)
export type DismissedHintReducerState = Record<
  HintKey,
  {
    rememberDismissal: boolean
  }
>
const dismissedHintsInitialState = {}
// @ts-expect-error(sa, 2021-6-21): cannot use string literals as action type
// TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
const dismissedHints: Reducer<DismissedHintReducerState, any> = handleActions(
  {
    // NOTE: only "rememberDismissal" hints should have been persisted
    REHYDRATE_PERSISTED: (
      state: DismissedHintReducerState,
      action: RehydratePersistedAction
    ) => {
      const persistedState = action.payload?.['tutorial.dismissedHints']
      return persistedState !== undefined ? persistedState : state
    },
    REMOVE_HINT: (
      state: DismissedHintReducerState,
      action: RemoveHintAction
    ): DismissedHintReducerState => {
      const { hintKey, rememberDismissal } = action.payload
      // TODO(IL 2020-02-24): consider using an immutable type for DismissedHintReducerState
      // to make this copy-mutate pattern less precarious, see #5073
      // (Flow won't let you do `return {...state, [hintKey]: spam})`) b/c it no longer
      // allows Unions as computed properties
      const nextState = { ...state }
      nextState[hintKey] = {
        rememberDismissal,
      }
      return nextState
    },
    CLEAR_ALL_HINT_DISMISSALS: () => dismissedHintsInitialState,
  },
  dismissedHintsInitialState
)
export const dismissedHintsPersist = (
  state: DismissedHintReducerState
): Partial<DismissedHintReducerState> => {
  // persist only 'rememberDismissal' hints
  return pickBy(
    state,
    (h: DismissedHintReducerState[keyof DismissedHintReducerState]) =>
      h && h.rememberDismissal
  )
}
const _allReducers = {
  hints,
  dismissedHints,
}
export interface RootState {
  hints: HintReducerState
  dismissedHints: DismissedHintReducerState
}
export const rootReducer: Reducer<RootState, Action> = combineReducers(
  _allReducers
)
