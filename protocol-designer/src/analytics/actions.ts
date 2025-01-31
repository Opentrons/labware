import { OLDEST_MIGRATEABLE_VERSION } from '../load-file/migration'
import { setMixpanelTracking } from './mixpanel'
import type { AnalyticsEvent } from './mixpanel'

export interface SetOptIn {
  type: 'SET_OPT_IN'
  payload: { hasOptedIn: boolean; appVersion: string }
}

const _setOptIn = (payload: SetOptIn['payload']): SetOptIn => {
  // side effects
  if (payload) {
    setMixpanelTracking(true)
  } else {
    setMixpanelTracking(false)
  }

  return {
    type: 'SET_OPT_IN',
    payload: { hasOptedIn: payload.hasOptedIn, appVersion: payload.appVersion },
  }
}

export const optIn = (): SetOptIn =>
  _setOptIn({
    hasOptedIn: true,
    appVersion: process.env.OT_PD_VERSION || OLDEST_MIGRATEABLE_VERSION,
  })
export const optOut = (): SetOptIn =>
  _setOptIn({
    hasOptedIn: false,
    appVersion: process.env.OT_PD_VERSION || OLDEST_MIGRATEABLE_VERSION,
  })
export interface AnalyticsEventAction {
  type: 'ANALYTICS_EVENT'
  payload: AnalyticsEvent
  meta?: unknown
}
// NOTE: this action creator should only be used for special cases where you want to
// report an analytics event but you do not have any Redux action that sensibly represents
// that analytics event.
//
// When there *is* a Redux action associated with what you want to report to analytics,
// use the analytics middleware (usually this means adding a case to
// `reduxActionToAnalyticsEvent` fn) and don't dispatch ANALYTICS_EVENT.
//
// PS: ANALYTICS_EVENT action is effected by the analytics middleware anyway, because
// we need to read opt-in status from the Redux state.
export const analyticsEvent = (
  payload: AnalyticsEvent
): AnalyticsEventAction => ({
  type: 'ANALYTICS_EVENT',
  payload,
})
