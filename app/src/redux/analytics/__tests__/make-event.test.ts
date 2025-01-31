import { vi, describe, it, expect, beforeEach } from 'vitest'

import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { makeEvent } from '../make-event'
import * as selectors from '../selectors'

vi.mock('../selectors')
vi.mock('../../sessions/selectors')
vi.mock('../../discovery/selectors')
vi.mock('../../pipettes/selectors')
vi.mock('../../calibration/selectors')

describe('analytics events map', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('events with protocol data', () => {
    it('robotAdmin:RESET_CONFIG -> resetRobotConfig event', () => {
      const state = {} as any
      const action = {
        type: 'robotAdmin:RESET_CONFIG',
        payload: {
          robotName: 'robotName',
          resets: {
            foo: true,
            bar: true,
          },
        },
      } as any
      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'resetRobotConfig',
        properties: {
          ...action.payload.resets,
        },
      })
    })
  })

  describe('events with calibration data', () => {
    it('analytics:PIPETTE_OFFSET_STARTED -> pipetteOffsetCalibrationStarted event', () => {
      const state = {} as any
      const action = {
        type: 'analytics:PIPETTE_OFFSET_STARTED',
        payload: {
          someStuff: 'some-other-stuff',
        },
      } as any
      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'pipetteOffsetCalibrationStarted',
        properties: {
          ...action.payload,
          robotType: OT2_ROBOT_TYPE,
        },
      })
    })

    it('analytics:TIP_LENGTH_STARTED -> tipLengthCalibrationStarted event', () => {
      const state = {} as any
      const action = {
        type: 'analytics:TIP_LENGTH_STARTED',
        payload: {
          someStuff: 'some-other-stuff',
        },
      } as any
      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'tipLengthCalibrationStarted',
        properties: {
          ...action.payload,
          robotType: OT2_ROBOT_TYPE,
        },
      })
    })

    it('sessions:CREATE_SESSION_COMMAND for exit -> {type}Exit', () => {
      const state = {} as any
      const action = {
        type: 'sessions:CREATE_SESSION_COMMAND',
        payload: {
          robotName: 'my-robot',
          sessionId: 'seshid',
          command: { command: 'calibration.exitSession' },
          robotType: OT2_ROBOT_TYPE,
        },
      } as any
      vi.mocked(selectors.getAnalyticsSessionExitDetails).mockReturnValue({
        sessionType: 'my-session-type',
        step: 'session-step',
      })

      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'my-session-typeExit',
        properties: { step: 'session-step', robotType: OT2_ROBOT_TYPE },
      })
    })

    it('sessions:CREATE_SESSION_COMMAND for loadLabware -> {type}Exit', () => {
      const state = {} as any
      const action = {
        type: 'sessions:CREATE_SESSION_COMMAND',
        payload: {
          robotName: 'my-robot',
          sessionId: 'seshid',
          command: {
            command: 'calibration.loadLabware',
            data: {
              tiprackDefinition: {
                metadata: { displayName: 'some display name' },
              },
            },
          },
        },
      } as any
      vi.mocked(selectors.getSessionInstrumentAnalyticsData).mockReturnValue({
        sessionType: 'my-session-type',
        pipetteModel: 'my-pipette-model',
      })

      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'my-session-typeTipRackSelect',
        properties: {
          pipetteModel: 'my-pipette-model',
          tipRackDisplayName: 'some display name',
          robotType: OT2_ROBOT_TYPE,
        },
      })
    })

    it('analytics:RESOURCE_MONITOR_REPORT -> resourceMonitorReport event', () => {
      const state = {} as any
      const action = {
        type: 'analytics:RESOURCE_MONITOR_REPORT',
        payload: {
          systemAvailMemMb: '500',
          systemUptimeHrs: '111',
          processesDetails: [],
        },
      } as any

      return expect(makeEvent(action, state)).resolves.toEqual({
        name: 'resourceMonitorReport',
        properties: { ...action.payload },
      })
    })
  })
})
