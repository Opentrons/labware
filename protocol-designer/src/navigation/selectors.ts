import { rootSelector as navigationRootSelector } from './reducers'
import type { BaseState, Selector } from '../types'
export const getNewProtocolModal: Selector<boolean> = (state: BaseState) =>
  navigationRootSelector(state).newProtocolModal
