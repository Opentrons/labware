// redux action types to analytics events map
import * as CustomLabware from '../custom-labware'
import * as SystemInfo from '../system-info'
import * as RobotUpdate from '../robot-update/constants'
import * as Sessions from '../sessions'
import * as Alerts from '../alerts'
import * as Constants from './constants'
import { sharedCalCommands } from '../sessions/common-calibration/constants'
import * as RobotAdmin from '../robot-admin'

import {
  getBuildrootAnalyticsData,
  getAnalyticsSessionExitDetails,
  getSessionInstrumentAnalyticsData,
} from './selectors'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import type { State, Action } from '../types'
import type { AnalyticsEvent } from './types'

const EVENT_APP_UPDATE_DISMISSED = 'appUpdateDismissed'

export function makeEvent(
  action: Action,
  state: State
): Promise<AnalyticsEvent | null> {
  switch (action.type) {
    // robot update events
    case RobotUpdate.ROBOTUPDATE_SET_UPDATE_SEEN: {
      const data = getBuildrootAnalyticsData(state, action.meta.robotName)
      return Promise.resolve({
        name: Constants.ANALYTICS_ROBOT_UPDATE_VIEW,
        properties: { ...data },
      })
    }

    case RobotUpdate.ROBOTUPDATE_CHANGELOG_SEEN: {
      const data = getBuildrootAnalyticsData(state, action.meta.robotName)
      return Promise.resolve({
        name: Constants.ANALYTICS_ROBOT_UPDATE_CHANGE_LOG_VIEW,
        properties: { ...data },
      })
    }

    case RobotUpdate.ROBOTUPDATE_UPDATE_IGNORED: {
      const data = getBuildrootAnalyticsData(state, action.meta.robotName)
      return Promise.resolve({
        name: Constants.ANALYTICS_STATE_ROBOT_UPDATE.IGNORE,
        properties: { ...data },
      })
    }

    case RobotUpdate.ROBOTUPDATE_START_UPDATE: {
      const data = getBuildrootAnalyticsData(state)
      return Promise.resolve({
        name: Constants.ANALYTICS_STATE_ROBOT_UPDATE.INITIATE,
        properties: { ...data },
      })
    }

    case RobotUpdate.ROBOTUPDATE_UNEXPECTED_ERROR: {
      const data = getBuildrootAnalyticsData(state)
      return Promise.resolve({
        name: Constants.ANALYTICS_STATE_ROBOT_UPDATE.ERROR,
        properties: { ...data },
      })
    }

    case RobotUpdate.ROBOTUPDATE_SET_SESSION_STEP: {
      if (action.payload !== 'finished') return Promise.resolve(null)
      const data = getBuildrootAnalyticsData(state)
      return Promise.resolve({
        name: Constants.ANALYTICS_STATE_ROBOT_UPDATE.COMPLETE,
        properties: { ...data },
      })
    }

    case CustomLabware.CUSTOM_LABWARE_LIST: {
      const { payload: labware, meta } = action
      const { source } = meta
      const customLabwareCount = labware.filter(
        lw => lw.type === CustomLabware.VALID_LABWARE_FILE
      ).length
      const superProperties = { customLabwareCount }

      if (
        source === CustomLabware.ADD_LABWARE ||
        source === CustomLabware.OVERWRITE_LABWARE
      ) {
        return Promise.resolve({
          name: Constants.ANALYTICS_ADD_CUSTOM_LABWARE,
          properties: {
            success: true,
            overwrite: source === CustomLabware.OVERWRITE_LABWARE,
            error: '',
          },
          superProperties,
        })
      }

      if (source === CustomLabware.CHANGE_DIRECTORY) {
        return Promise.resolve({
          name: 'changeLabwareSourceDirectory',
          properties: { success: true, error: '' },
          superProperties,
        })
      }

      return Promise.resolve({ superProperties })
    }

    case CustomLabware.CUSTOM_LABWARE_LIST_FAILURE: {
      const { message: error } = action.payload
      const { source } = action.meta

      if (source === CustomLabware.CHANGE_DIRECTORY) {
        return Promise.resolve({
          name: 'changeLabwareSourceDirectory',
          properties: { success: false, error },
        })
      }

      if (source === CustomLabware.INITIAL) {
        return Promise.resolve({
          name: 'customLabwareListError',
          properties: { error },
        })
      }

      break
    }

    case CustomLabware.ADD_CUSTOM_LABWARE_FAILURE: {
      const { labware, message } = action.payload
      let error = ''

      if (labware !== null) {
        error = labware.type
      } else if (message !== null) {
        error = message
      }

      return Promise.resolve({
        name: Constants.ANALYTICS_ADD_CUSTOM_LABWARE,
        properties: { success: false, overwrite: false, error },
      })
    }

    case SystemInfo.INITIALIZED:
    case SystemInfo.USB_DEVICE_ADDED:
    case SystemInfo.NETWORK_INTERFACES_CHANGED: {
      const systemInfoProps = SystemInfo.getU2EDeviceAnalyticsProps(state)

      return Promise.resolve(
        systemInfoProps != null
          ? {
              superProperties: {
                ...systemInfoProps,
                // anonymize IP address so analytics profile can't be mapped to more
                // specific Intercom support profile
                'U2E IPv4 Address': Boolean(
                  systemInfoProps['U2E IPv4 Address']
                ),
              },
            }
          : null
      )
    }

    case Sessions.CREATE_SESSION_COMMAND: {
      switch (action.payload.command.command) {
        case sharedCalCommands.EXIT: {
          const sessionDetails = getAnalyticsSessionExitDetails(
            state,
            action.payload.robotName,
            action.payload.sessionId
          )
          return Promise.resolve(
            sessionDetails != null
              ? {
                  name: `${sessionDetails.sessionType}Exit`,
                  properties: {
                    step: sessionDetails.step,
                    robotType: OT2_ROBOT_TYPE,
                  },
                }
              : null
          )
        }
        case sharedCalCommands.LOAD_LABWARE: {
          const commandData = action.payload.command.data
          if (commandData != null) {
            const instrData = getSessionInstrumentAnalyticsData(
              state,
              action.payload.robotName,
              action.payload.sessionId
            )
            return Promise.resolve(
              instrData != null
                ? {
                    name: `${instrData.sessionType}TipRackSelect`,
                    properties: {
                      pipetteModel: instrData.pipetteModel,
                      tipRackDisplayName:
                        'tiprackDefinition' in commandData
                          ? commandData.tiprackDefinition.metadata.displayName
                          : null,
                      robotType: OT2_ROBOT_TYPE,
                    },
                  }
                : null
            )
          } else {
            return Promise.resolve(null)
          }
        }
        default:
          return Promise.resolve(null)
      }
    }

    case Alerts.ALERT_DISMISSED: {
      const { alertId, remember } = action.payload

      if (alertId === Alerts.ALERT_APP_UPDATE_AVAILABLE) {
        return Promise.resolve({
          name: EVENT_APP_UPDATE_DISMISSED,
          properties: { updatesIgnored: remember },
        })
      }

      return Promise.resolve(null)
    }

    case Constants.ANALYTICS_PIPETTE_OFFSET_STARTED: {
      return Promise.resolve({
        name: 'pipetteOffsetCalibrationStarted',
        properties: {
          ...action.payload,
          robotType: OT2_ROBOT_TYPE,
        },
      })
    }

    case Constants.ANALYTICS_TIP_LENGTH_STARTED: {
      return Promise.resolve({
        name: 'tipLengthCalibrationStarted',
        properties: {
          ...action.payload,
          robotType: OT2_ROBOT_TYPE,
        },
      })
    }

    case Constants.ANALYTICS_RESOURCE_MONITOR_REPORT: {
      return Promise.resolve({
        name: 'resourceMonitorReport',
        properties: {
          ...action.payload,
        },
      })
    }

    case RobotAdmin.RESET_CONFIG: {
      const { resets } = action.payload
      return Promise.resolve({
        name: 'resetRobotConfig',
        properties: { ...resets },
      })
    }
  }

  return Promise.resolve(null)
}
