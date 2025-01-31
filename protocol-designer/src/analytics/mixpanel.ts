import mixpanel from 'mixpanel-browser'
import { getIsProduction } from '../networking/opentronsWebApi'
import { getHasOptedIn } from './selectors'
import type { BaseState } from '../types'

export type AnalyticsEvent =
  | {
      name: string
      properties: Record<string, unknown>
      superProperties?: Record<string, unknown>
    }
  | { superProperties: Record<string, unknown> }

// pulled in from environment at build time
const MIXPANEL_ID = getIsProduction()
  ? process.env.OT_PD_MIXPANEL_ID
  : process.env.OT_PD_MIXPANEL_DEV_ID

const MIXPANEL_OPTS = {
  opt_out_tracking_by_default: true,
}

export function initializeMixpanel(state: BaseState): void {
  const optedIn = getHasOptedIn(state)?.hasOptedIn ?? false
  if (MIXPANEL_ID != null) {
    try {
      console.debug('Initializing Mixpanel', { optedIn })
      mixpanel.init(MIXPANEL_ID, MIXPANEL_OPTS)
      setMixpanelTracking(optedIn)
      trackEvent({ name: 'appOpen', properties: {} }, optedIn)
    } catch (error) {
      console.error('Error initializing Mixpanel:', error)
    }
  } else {
    console.warn('MIXPANEL_ID not found; this is a bug if build is production')
  }
}

// NOTE: Do not use directly. Used in analytics Redux middleware: trackEventMiddleware.
export function trackEvent(event: AnalyticsEvent, optedIn: boolean): void {
  console.debug('Trackable event', { event, optedIn })
  if (MIXPANEL_ID != null && optedIn) {
    try {
      if ('superProperties' in event && event.superProperties != null) {
        mixpanel.register(event.superProperties)
      }
      if ('name' in event && event.name != null) {
        mixpanel.track(event.name, event.properties)
      }
    } catch (error) {
      console.error('Error tracking event:', error)
    }
  }
}

export function setMixpanelTracking(optedIn: boolean): void {
  if (MIXPANEL_ID != null) {
    try {
      if (optedIn) {
        console.debug('User has opted into analytics; tracking with Mixpanel')
        mixpanel.opt_in_tracking()
        mixpanel.register({
          appVersion: process.env.OT_PD_VERSION,
          appName: 'protocolDesigner',
        })
      } else {
        console.debug(
          'User has opted out of analytics; stopping Mixpanel tracking'
        )
        mixpanel.opt_out_tracking()
        mixpanel.reset()
      }
    } catch (error) {
      console.error('Error setting Mixpanel tracking:', error)
    }
  }
}
