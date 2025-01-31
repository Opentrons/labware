import last from 'lodash/last'
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import * as utils from '../../../../utils'
import * as stepFormSelectors from '../../../../step-forms/selectors'
import { getRobotStateTimeline } from '../../../../file-data/selectors'
import { getMultiSelectLastSelected } from '../../selectors'
import { selectAllSteps, deselectAllSteps } from '../actions'
import {
  duplicateStep,
  duplicateMultipleSteps,
  saveHeaterShakerFormWithAddedPauseUntilTemp,
  saveSetTempFormWithAddedPauseUntilTemp,
} from '../thunks'
import type { Timeline, RobotState } from '@opentrons/step-generation/src/types'

vi.mock('../../../../step-forms/selectors')
vi.mock('../../selectors')
vi.mock('../../../../file-data/selectors')

const mockStore = configureMockStore([thunk])

const initialRobotState: RobotState = {
  labware: {
    fixedTrash: {
      slot: '12',
    },
    tiprackId: {
      slot: '1',
    },
    plateId: {
      slot: '7',
    },
  },
  modules: {},
  pipettes: {
    pipetteId: {
      mount: 'left',
    },
  },
  liquidState: {
    pipettes: {},
    labware: {},
    additionalEquipment: {},
  },
  tipState: {
    pipettes: {},
    tipracks: {},
  },
}

describe('steps actions', () => {
  describe('selectAllSteps', () => {
    let ids: string[]
    beforeEach(() => {
      ids = ['id_1', 'id_2']
      when(vi.mocked(stepFormSelectors.getOrderedStepIds))
        .calledWith(expect.anything())
        .thenReturn(ids)
    })
    afterEach(() => {
      vi.resetAllMocks()
    })
    it('should select all of the steps', () => {
      const store: any = mockStore()
      store.dispatch(selectAllSteps())
      expect(store.getActions()).toContainEqual({
        type: 'SELECT_MULTIPLE_STEPS',
        payload: {
          stepIds: ids,
          lastSelected: last(ids),
        },
      })
    })
    it('should register an analytics event', () => {
      const store: any = mockStore()
      store.dispatch(selectAllSteps())
      expect(store.getActions()).toContainEqual({
        type: 'ANALYTICS_EVENT',
        payload: {
          name: 'selectAllSteps',
          properties: {},
        },
      })
    })
  })
  describe('deselectAllSteps', () => {
    const id = 'some_id'
    beforeEach(() => {
      when(vi.mocked(getMultiSelectLastSelected))
        .calledWith(expect.anything())
        .thenReturn(id)
    })
    afterEach(() => {
      vi.resetAllMocks()
    })
    it('should deselect all of the steps', () => {
      const store: any = mockStore()
      store.dispatch(deselectAllSteps())
      expect(store.getActions()).toContainEqual({
        type: 'SELECT_STEP',
        payload: id,
      })
    })
    it('should register a "deslectAllSteps" analytics event', () => {
      const store: any = mockStore()
      store.dispatch(deselectAllSteps())
      expect(store.getActions()).toContainEqual({
        type: 'ANALYTICS_EVENT',
        payload: {
          name: 'deselectAllSteps',
          properties: {},
        },
      })
    })
    it('should register a "exitBatchEditMode" analytics event when given a meta flag', () => {
      const store: any = mockStore()
      store.dispatch(deselectAllSteps('EXIT_BATCH_EDIT_MODE_BUTTON_PRESS'))
      expect(store.getActions()).toContainEqual({
        type: 'ANALYTICS_EVENT',
        payload: {
          name: 'exitBatchEditMode',
          properties: {},
        },
      })
    })
    it('should console warn when NOT in multi select mode', () => {
      when(vi.mocked(getMultiSelectLastSelected))
        .calledWith(expect.anything())
        .thenReturn(null)
      const consoleWarnSpy = vi
        .spyOn(global.console, 'warn')
        .mockImplementation(() => null)
      const store: any = mockStore()
      store.dispatch(deselectAllSteps())
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'something went wrong, cannot deselect all steps if not in multi select mode'
      )
      consoleWarnSpy.mockRestore()
    })
  })
  describe('duplicateStep', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })
    it('should duplicate a step with a new step id', () => {
      vi.spyOn(utils, 'uuid').mockReturnValue('duplicate_id')
      const store: any = mockStore()
      store.dispatch(duplicateStep('id_1'))
      expect(store.getActions()).toEqual([
        {
          type: 'DUPLICATE_STEP',
          payload: {
            stepId: 'id_1',
            duplicateStepId: 'duplicate_id',
          },
        },
      ])
    })
  })
  describe('duplicateMultipleSteps', () => {
    let ids
    beforeEach(() => {
      ids = ['id_1', 'id_2', 'id_3']
      when(vi.mocked(stepFormSelectors.getOrderedStepIds))
        .calledWith(expect.anything())
        .thenReturn(ids)
      when(vi.mocked(getMultiSelectLastSelected))
        .calledWith(expect.anything())
        .thenReturn('id_3')
    })
    afterEach(() => {
      vi.resetAllMocks()
      vi.restoreAllMocks()
    })
    it('should duplicate multiple steps with a new step ids, and select the new duplicated steps', () => {
      vi.spyOn(utils, 'uuid')
        .mockReturnValueOnce('dup_1')
        .mockReturnValueOnce('dup_2')
        .mockReturnValueOnce('dup_3')
      const store: any = mockStore()
      store.dispatch(duplicateMultipleSteps(['id_1', 'id_2', 'id_3']))
      const duplicateStepsAction = {
        type: 'DUPLICATE_MULTIPLE_STEPS',
        payload: {
          steps: [
            {
              stepId: 'id_1',
              duplicateStepId: 'dup_1',
            },
            {
              stepId: 'id_2',
              duplicateStepId: 'dup_2',
            },
            {
              stepId: 'id_3',
              duplicateStepId: 'dup_3',
            },
          ],
          indexToInsert: 3,
        },
      }
      const selectMultipleStepsAction = {
        type: 'SELECT_MULTIPLE_STEPS',
        payload: {
          stepIds: ['dup_1', 'dup_2', 'dup_3'],
          lastSelected: 'dup_3',
        },
      }
      expect(store.getActions()).toEqual([
        duplicateStepsAction,
        selectMultipleStepsAction,
      ])
    })
    it('should duplicate multiple steps with a new step ids, and select the new duplicated steps even when provided in a non linear order', () => {
      vi.spyOn(utils, 'uuid')
        .mockReturnValueOnce('dup_1')
        .mockReturnValueOnce('dup_2')
        .mockReturnValueOnce('dup_3')
      const store: any = mockStore()
      store.dispatch(duplicateMultipleSteps(['id_3', 'id_1', 'id_2']))
      const duplicateStepsAction = {
        type: 'DUPLICATE_MULTIPLE_STEPS',
        payload: {
          steps: [
            {
              stepId: 'id_1',
              duplicateStepId: 'dup_1',
            },
            {
              stepId: 'id_2',
              duplicateStepId: 'dup_2',
            },
            {
              stepId: 'id_3',
              duplicateStepId: 'dup_3',
            },
          ],
          indexToInsert: 3,
        },
      }
      const selectMultipleStepsAction = {
        type: 'SELECT_MULTIPLE_STEPS',
        payload: {
          stepIds: ['dup_1', 'dup_2', 'dup_3'],
          lastSelected: 'dup_3',
        },
      }
      expect(store.getActions()).toEqual([
        duplicateStepsAction,
        selectMultipleStepsAction,
      ])
    })
  })

  describe('saveHeaterShakerFormWithAddedPauseUntilTemp', () => {
    const mockRobotStateTimeline: Timeline = {
      timeline: [
        {
          commands: [
            {
              commandType: 'heaterShaker/waitForTemperature',

              params: {
                moduleId: 'heaterShakerId',
              },
            },
          ],
          robotState: initialRobotState,
          warnings: [],
        },
      ],
      errors: null,
    }

    beforeEach(() => {
      when(vi.mocked(stepFormSelectors.getUnsavedForm))
        .calledWith(expect.anything())
        .thenReturn({
          stepType: 'heaterShaker',
          targetHeaterShakerTemperature: '10',
        } as any)
      vi.mocked(
        stepFormSelectors.getUnsavedFormIsPristineHeaterShakerForm
      ).mockReturnValue(true)
      vi.mocked(getRobotStateTimeline).mockReturnValue(mockRobotStateTimeline)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should save heater shaker step with a pause until temp is reached', () => {
      const HsStepWithPause = [
        {
          payload: {
            stepType: 'heaterShaker',
            targetHeaterShakerTemperature: '10',
          },
          type: 'SAVE_STEP_FORM',
        },

        {
          meta: {
            robotStateTimeline: {
              errors: null,
              timeline: [
                {
                  commands: [
                    {
                      commandType: 'heaterShaker/waitForTemperature',
                      params: {
                        moduleId: 'heaterShakerId',
                      },
                    },
                  ],
                  robotState: {
                    labware: {
                      plateId: {
                        slot: '7',
                      },
                      tiprackId: {
                        slot: '1',
                      },
                      fixedTrash: {
                        slot: '12',
                      },
                    },
                    liquidState: {
                      labware: {},
                      pipettes: {},
                      additionalEquipment: {},
                    },
                    modules: {},
                    pipettes: {
                      pipetteId: {
                        mount: 'left',
                      },
                    },
                    tipState: {
                      pipettes: {},
                      tipracks: {},
                    },
                  },
                  warnings: [],
                },
              ],
            },
          },
          payload: {
            id: '__presaved_step__',
            stepType: 'pause',
          },
          type: 'ADD_STEP',
        },
        {
          payload: {
            update: {
              pauseAction: 'untilTemperature',
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            update: {
              moduleId: undefined,
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            update: {
              pauseTemperature: '10',
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            stepType: 'heaterShaker',
            targetHeaterShakerTemperature: '10',
          },
          type: 'SAVE_STEP_FORM',
        },
      ]

      const store: any = mockStore()
      store.dispatch(saveHeaterShakerFormWithAddedPauseUntilTemp())

      expect(store.getActions()).toEqual(HsStepWithPause)
    })
  })

  describe('saveSetTempFormWithAddedPauseUntilTemp', () => {
    const mockRobotStateTimeline: Timeline = {
      timeline: [
        {
          commands: [
            {
              commandType: 'temperatureModule/setTargetTemperature',

              params: {
                moduleId: 'temperatureId',
                celsius: 25,
              },
            },
          ],
          robotState: initialRobotState,
          warnings: [],
        },
      ],
      errors: null,
    }

    beforeEach(() => {
      when(vi.mocked(stepFormSelectors.getUnsavedForm))
        .calledWith(expect.anything())
        .thenReturn({
          stepType: 'temperature',
          setTemperature: 'true',
          targetTemperature: 10,
          moduleId: 'mockTemp',
        } as any)
      vi.mocked(
        stepFormSelectors.getUnsavedFormIsPristineSetTempForm
      ).mockReturnValue(true)
      vi.mocked(getRobotStateTimeline).mockReturnValue(mockRobotStateTimeline)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should save temperature step with a pause until temp is reached', () => {
      const temperatureStepWithPause = [
        {
          payload: {
            setTemperature: 'true',
            stepType: 'temperature',
            targetTemperature: 10,
            moduleId: 'mockTemp',
          },
          type: 'SAVE_STEP_FORM',
        },

        {
          meta: {
            robotStateTimeline: {
              errors: null,
              timeline: [
                {
                  commands: [
                    {
                      commandType: 'temperatureModule/setTargetTemperature',
                      params: {
                        moduleId: 'temperatureId',
                        celsius: 25,
                      },
                    },
                  ],
                  robotState: {
                    labware: {
                      plateId: {
                        slot: '7',
                      },
                      tiprackId: {
                        slot: '1',
                      },
                      fixedTrash: {
                        slot: '12',
                      },
                    },
                    liquidState: {
                      labware: {},
                      pipettes: {},
                      additionalEquipment: {},
                    },
                    modules: {},
                    pipettes: {
                      pipetteId: {
                        mount: 'left',
                      },
                    },
                    tipState: {
                      pipettes: {},
                      tipracks: {},
                    },
                  },
                  warnings: [],
                },
              ],
            },
          },
          payload: {
            id: '__presaved_step__',
            stepType: 'pause',
          },
          type: 'ADD_STEP',
        },
        {
          payload: {
            update: {
              pauseAction: 'untilTemperature',
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            update: {
              moduleId: 'mockTemp',
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            update: {
              pauseTemperature: 10,
            },
          },
          type: 'CHANGE_FORM_INPUT',
        },
        {
          payload: {
            setTemperature: 'true',
            stepType: 'temperature',
            targetTemperature: 10,
            moduleId: 'mockTemp',
          },
          type: 'SAVE_STEP_FORM',
        },
      ]

      const store: any = mockStore()
      store.dispatch(saveSetTempFormWithAddedPauseUntilTemp())

      expect(store.getActions()).toEqual(temperatureStepWithPause)
    })
  })
})
