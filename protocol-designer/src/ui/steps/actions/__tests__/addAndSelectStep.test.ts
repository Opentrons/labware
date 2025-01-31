import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fixture12Trough, fixtureTiprack1000ul } from '@opentrons/shared-data'
import { addAndSelectStep } from '../thunks'
import { PRESAVED_STEP_ID } from '../../../../steplist/types'
import { addHint } from '../../../../tutorial/actions'
import { selectors as labwareIngredSelectors } from '../../../../labware-ingred/selectors'
import * as fileDataSelectors from '../../../../file-data/selectors'
import { getInitialDeckSetup } from '../../../../step-forms/selectors'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { StepType } from '../../../../form-types'

vi.mock('../../../../tutorial/actions')
vi.mock('../../../../ui/modules/selectors')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../step-forms/selectors')
const dispatch = vi.fn()
const getState = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(addHint).mockReturnValue('addHintReturnValue' as any)
  vi.mocked(labwareIngredSelectors.getDeckHasLiquid).mockReturnValue(true)
  vi.mocked(fileDataSelectors.getRobotStateTimeline).mockReturnValue(
    'mockGetRobotStateTimelineValue' as any
  )
  vi.mocked(getInitialDeckSetup).mockReturnValue({
    modules: {},
    labware: {},
    pipettes: {},
    additionalEquipmentOnDeck: {},
  })
})
describe('addAndSelectStep', () => {
  it('should dispatch addStep thunk, and no hints when no hints are applicable (eg pause step)', () => {
    const stepType: StepType = 'pause'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'pause',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
    ])
  })
  it('should dispatch a thermocycler selected action if the step type is thermocycler', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        modId: {
          type: 'thermocyclerModuleType',
          id: 'modId',
          slot: 'B2',
          model: 'thermocyclerModuleV1',
          moduleState: {} as any,
        },
      },
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'thermocycler'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'thermocycler',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
      [
        {
          type: 'SELECT_DROPDOWN_ITEM',
          payload: {
            selection: { id: 'modId', text: 'Selected', field: '1' },
            mode: 'add',
          },
        },
      ],
    ])
  })
  it('should dispatch a magnet module selected action if the step type is magnet', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        modId: {
          type: 'magneticModuleType',
          id: 'modId',
          slot: '1',
          model: 'magneticModuleV1',
          moduleState: {} as any,
        },
      },
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'magnet'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'magnet',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
      [
        {
          type: 'SELECT_DROPDOWN_ITEM',
          payload: {
            selection: { id: 'modId', text: 'Selected', field: '1' },
            mode: 'add',
          },
        },
      ],
    ])
  })
  it('should dispatch a temperature module selected action if the step type is temperature and only 1 temp mod', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        modId: {
          type: 'temperatureModuleType',
          id: 'modId',
          slot: 'B2',
          model: 'temperatureModuleV1',
          moduleState: {} as any,
        },
      },
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'temperature'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'temperature',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
      [
        {
          type: 'SELECT_DROPDOWN_ITEM',
          payload: {
            selection: { id: 'modId', text: 'Selected', field: '1' },
            mode: 'add',
          },
        },
      ],
    ])
  })
  it('should not dispatch hs module selected action if the step type is hs and 2 mods', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        modId: {
          type: 'heaterShakerModuleType',
          id: 'modId',
          slot: 'B2',
          model: 'heaterShakerModuleV1',
          moduleState: {} as any,
        },
        modId2: {
          type: 'heaterShakerModuleType',
          id: 'modId2',
          slot: 'A1',
          model: 'heaterShakerModuleV1',
          moduleState: {} as any,
        },
      },
      labware: {},
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'heaterShaker'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'heaterShaker',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
    ])
  })
  it('should dispatch labware selected action if the step type is mix and only 1 labware', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      labware: {
        labware: {
          id: 'labware',
          def: fixture12Trough as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'A1',
        },
        labware2: {
          id: 'labware2',
          def: fixtureTiprack1000ul as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'B1',
        },
      },
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'mix'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'mix',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
      [
        {
          type: 'SELECT_DROPDOWN_ITEM',
          payload: {
            selection: { id: 'labware', text: 'Selected', field: '1' },
            mode: 'add',
          },
        },
      ],
    ])
  })
  it('should not dispatch labware selected action if the step type is moveLiquid and 2 labware', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      labware: {
        labware: {
          id: 'labware',
          def: fixture12Trough as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'A1',
        },
        labware2: {
          id: 'labware2',
          def: fixture12Trough as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'B1',
        },
      },
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'moveLiquid'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'moveLiquid',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
    ])
  })
  it('should dispatch move labware selected action if the step type is moveLabware and only 1 labware', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      labware: {
        labware2: {
          id: 'labware2',
          def: fixtureTiprack1000ul as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'B1',
        },
      },
      pipettes: {},
      additionalEquipmentOnDeck: {},
    })
    const stepType: StepType = 'moveLabware'
    const payload = {
      stepType,
    }
    addAndSelectStep(payload)(dispatch, getState)
    expect(dispatch.mock.calls).toEqual([
      [
        {
          type: 'ADD_STEP',
          payload: {
            id: PRESAVED_STEP_ID,
            stepType: 'moveLabware',
          },
          meta: {
            robotStateTimeline: 'mockGetRobotStateTimelineValue',
          },
        },
      ],
      [
        {
          type: 'SELECT_DROPDOWN_ITEM',
          payload: {
            selection: { id: 'labware2', text: 'Selected', field: '1' },
            mode: 'add',
          },
        },
      ],
    ])
  })
})
