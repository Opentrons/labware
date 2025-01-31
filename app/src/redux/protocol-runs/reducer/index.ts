import * as Constants from '../constants'
import { LPCReducer } from './lpc'

import type { Reducer } from 'redux'

import type { Action } from '../../types'
import type { ProtocolRunState } from '../types'

import { setupReducer } from './setup'

const INITIAL_STATE: ProtocolRunState = {}

export const protocolRunReducer: Reducer<ProtocolRunState, Action> = (
  state = INITIAL_STATE,
  action
) => {
  switch (action.type) {
    case Constants.UPDATE_RUN_SETUP_STEPS_COMPLETE:
    case Constants.UPDATE_RUN_SETUP_STEPS_REQUIRED: {
      const runId = action.payload.runId
      const currentRunState = state[runId]

      return {
        ...state,
        [runId]: {
          ...currentRunState,
          setup: setupReducer(currentRunState?.setup, action),
        },
      }
    }

    case Constants.START_LPC:
    case Constants.FINISH_LPC:
    case Constants.PROCEED_STEP:
    case Constants.GO_BACK_STEP:
    case Constants.SET_SELECTED_LABWARE_NAME:
    case Constants.SET_SELECTED_LABWARE:
    case Constants.CLEAR_SELECTED_LABWARE:
    case Constants.SET_INITIAL_POSITION:
    case Constants.SET_FINAL_POSITION: {
      const runId = action.payload.runId
      const currentRunState = state[runId] || { lpc: undefined }
      const nextLpcState = LPCReducer(currentRunState.lpc, action)

      return {
        ...state,
        [runId]: {
          ...currentRunState,
          lpc: nextLpcState,
        },
      }
    }

    default:
      return state
  }
}
