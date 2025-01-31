import type { BaseState } from '../types'
import type { OptInState } from './reducers'
export const getHasOptedIn = (state: BaseState): OptInState =>
  state.analytics.hasOptedIn
