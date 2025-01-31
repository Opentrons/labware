import { vi, describe, expect, afterEach, beforeEach, it } from 'vitest'
import { when } from 'vitest-when'
import { reduxActionToAnalyticsEvent } from '../middleware'
import {
  getFileMetadata,
  getRobotStateTimeline,
} from '../../file-data/selectors'
import {
  getArgsAndErrorsByStepId,
  getPipetteEntities,
  getSavedStepForms,
} from '../../step-forms/selectors'
import type { SaveStepFormsMultiAction } from '../../step-forms/actions'

vi.mock('../../file-data/selectors')
vi.mock('../../step-forms/selectors')

describe('reduxActionToAnalyticsEvent', () => {
  let fooState: any
  beforeEach(() => {
    fooState = {}
    vi.mocked(getFileMetadata).mockReturnValue({
      protocolName: 'protocol name here',
      created: 1600000000000, // 2020-09-13T12:26:40.000Z
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })

  it('should return null for unhandled actions', () => {
    expect(
      reduxActionToAnalyticsEvent(fooState, { type: 'SOME_UNHANDLED_ACTION' })
    ).toBe(null)
  })

  it('should return payload of ANALYTICS_EVENT action, as-is', () => {
    // IRL the payload would be an AnalyticsEventAction
    const action = { type: 'ANALYTICS_EVENT', payload: { foo: 123 } }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toBe(action.payload)
  })

  it('should render a timeline error from COMPUTE_ROBOT_STATE_TIMELINE_SUCCESS', () => {
    vi.mocked(getRobotStateTimeline).mockReturnValue({
      timeline: [],
      errors: [{ message: 'mockMessage', type: 'CANNOT_MOVE_WITH_GRIPPER' }],
    })
    const action = {
      type: 'COMPUTE_ROBOT_STATE_TIMELINE_SUCCESS',
      payload: ['CANNOT_MOVE_WITH_GRIPPER'],
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'timelineErrors',
      properties: { errorTypes: ['CANNOT_MOVE_WITH_GRIPPER'] },
    })
  })
  it('should render event for LOAD_FILE', () => {
    const action = {
      type: 'LOAD_FILE',
      payload: {},
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'loadFile',
      properties: {},
    })
  })
  it('should render event for GENERATE_NEW_PROTOCOL', () => {
    const action = {
      type: 'GENERATE_NEW_PROTOCOL',
      payload: {},
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'createNewProtocol',
      properties: {},
    })
  })
  it('should render event for CHANGE_STEP_DETAILS', () => {
    const action = {
      type: 'CHANGE_STEP_DETAILS',
      payload: {
        update: { stepDetails: 'mockStepDetails', stepName: 'mockStepName' },
      },
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'editStepMetadata',
      properties: { stepDetails: 'mockStepDetails', stepName: 'mockStepName' },
    })
  })
  it('should render event for SET_FEATURE_FLAGS', () => {
    const action = {
      type: 'SET_FEATURE_FLAGS',
      payload: { OT_PD_ALLOW_ALL_TIPRACKS: true },
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'allowAllTipracks',
      properties: {},
    })
  })
  it('should render event for CREATE_PIPETTES', () => {
    const action = {
      type: 'CREATE_PIPETTES',
      payload: {
        mockPip: {
          name: 'p1000_96',
          id: 'mockPip',
          tiprackDefURI: ['mockTip', 'mockTip2'],
        },
      },
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'numberOfTipracksPerPipette',
      properties: { mockPip: { name: 'p1000_96', numberOfTipracks: 2 } },
    })
  })
  it('should convert a SAVE_STEP_FORM action into a transferStep action with additional properties', () => {
    vi.mocked(getArgsAndErrorsByStepId).mockReturnValue({
      stepId: {
        stepArgs: {
          // @ts-expect-error id is not on type CommandCreatorArgs
          id: 'stepId',
          pipette: 'pipetteId',
          otherField: 123,
          nested: { inner: true },
          commandCreatorFnName: 'transfer',
        },
      },
    })
    vi.mocked(getPipetteEntities).mockReturnValue({
      // @ts-expect-error 'some_pipette_spec_name' isn't a valid pipette type
      pipetteId: { name: 'some_pipette_spec_name' },
    })

    const action = {
      type: 'SAVE_STEP_FORM',
      payload: {
        id:
          'stepId' /* .. other fields don't matter, will be read from getArgsAndErrors */,
      },
    }
    const result = reduxActionToAnalyticsEvent(fooState, action)
    expect(result).toEqual({
      name: 'transferStep',
      properties: {
        // existing fields
        id: 'stepId',
        pipette: 'pipetteId',
        otherField: 123,
        aspirateFlowRate: 'default',
        dispenseFlowRate: 'default',
        aspirateAirGap: 'default',
        dispenseAirGap: 'default',
        nested: { inner: true },
        // de-nested fields
        __nested__inner: true,
        // additional special properties for analytics
        __dateCreated: '2020-09-13T12:26:40.000Z',
        __protocolName: 'protocol name here',
        __pipetteName: 'some_pipette_spec_name',
      },
    })
  })

  describe('SAVE_STEP_FORMS_MULTI', () => {
    let action: SaveStepFormsMultiAction
    beforeEach(() => {
      action = {
        type: 'SAVE_STEP_FORMS_MULTI',
        payload: {
          stepIds: ['id_1', 'id_2'],
          editedFields: {
            someField: 'someVal',
            anotherField: 'anotherVal',
            someNestedField: {
              innerNestedField: true,
            },
          },
        },
      }
    })
    it('should create a saveStepsMulti action with additional properties and stepType moveLiquid', () => {
      when(vi.mocked(getSavedStepForms))
        .calledWith(expect.anything())
        .thenReturn({
          // @ts-expect-error missing fields from test object
          id_1: { stepType: 'moveLiquid' },
          // @ts-expect-error missing fields from test object
          id_2: { stepType: 'moveLiquid' },
        })

      const result = reduxActionToAnalyticsEvent(fooState, action)
      expect(result).toEqual({
        name: 'saveStepsMulti',
        properties: {
          // step type
          stepType: 'moveLiquid',
          // existing fields
          someField: 'someVal',
          anotherField: 'anotherVal',
          someNestedField: {
            innerNestedField: true,
          },
          // de-nested fields
          __someNestedField__innerNestedField: true,
          // additional special properties for analytics
          __dateCreated: '2020-09-13T12:26:40.000Z',
          __protocolName: 'protocol name here',
        },
      })
    })
    it('should create a saveStepsMulti action with additional properties and stepType mix', () => {
      when(vi.mocked(getSavedStepForms))
        .calledWith(expect.anything())
        .thenReturn({
          // @ts-expect-error missing fields from test object
          id_1: { stepType: 'mix' },
          // @ts-expect-error missing fields from test object
          id_2: { stepType: 'mix' },
        })

      const result = reduxActionToAnalyticsEvent(fooState, action)
      expect(result).toEqual({
        name: 'saveStepsMulti',
        properties: {
          // step type
          stepType: 'mix',
          // existing fields
          someField: 'someVal',
          anotherField: 'anotherVal',
          someNestedField: {
            innerNestedField: true,
          },
          // de-nested fields
          __someNestedField__innerNestedField: true,
          // additional special properties for analytics
          __dateCreated: '2020-09-13T12:26:40.000Z',
          __protocolName: 'protocol name here',
        },
      })
    })
    it('should create a saveStepsMulti action with additional properties and null steptype (mixed case)', () => {
      when(vi.mocked(getSavedStepForms))
        .calledWith(expect.anything())
        .thenReturn({
          // @ts-expect-error missing fields from test object
          id_1: { stepType: 'mix' },
          // @ts-expect-error missing fields from test object
          id_2: { stepType: 'moveLiquid' },
        })

      const result = reduxActionToAnalyticsEvent(fooState, action)
      expect(result).toEqual({
        name: 'saveStepsMulti',
        properties: {
          // step type
          stepType: null,
          // existing fields
          someField: 'someVal',
          anotherField: 'anotherVal',
          someNestedField: {
            innerNestedField: true,
          },
          // de-nested fields
          __someNestedField__innerNestedField: true,
          // additional special properties for analytics
          __dateCreated: '2020-09-13T12:26:40.000Z',
          __protocolName: 'protocol name here',
        },
      })
    })
  })
})
