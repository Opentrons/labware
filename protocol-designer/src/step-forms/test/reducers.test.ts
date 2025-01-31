import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
} from '@opentrons/shared-data'

import {
  orderedStepIds,
  labwareInvariantProperties,
  moduleInvariantProperties,
  presavedStepForm,
  savedStepForms,
  unsavedForm,
  batchEditFormChanges,
} from '../reducers'
import {
  _getPipetteEntitiesRootState,
  _getLabwareEntitiesRootState,
  _getInitialDeckSetupRootState,
} from '../selectors'
import { handleFormChange } from '../../steplist/formLevel/handleFormChange'
import { moveDeckItem } from '../../labware-ingred/actions'
import {
  INITIAL_DECK_SETUP_STEP_ID,
  SPAN7_8_10_11_SLOT,
  PAUSE_UNTIL_TEMP,
} from '../../constants'
import { PRESAVED_STEP_ID } from '../../steplist/types'
import { createPresavedStepForm } from '../utils/createPresavedStepForm'
import { getLabwareIsCompatible } from '../../utils/labwareModuleCompatibility'

import type { ModuleEntity } from '@opentrons/step-generation'
import type { DeckSlot } from '../../types'
import type { DeleteContainerAction } from '../../labware-ingred/actions/actions'
import type {
  ChangeFormInputAction,
  DeleteMultipleStepsAction,
} from '../../steplist/actions'
import type { FormData, StepType } from '../../form-types'
import type {
  SavedStepFormsActions,
  UnsavedFormActions,
  RootState,
  PresavedStepFormState,
  PresavedStepFormAction,
} from '../reducers'
import type {
  DeletePipettesAction,
  SubstituteStepFormPipettesAction,
} from '../actions/pipettes'
import type {
  CreateModuleAction,
  DeleteModuleAction,
  EditModuleAction,
} from '../actions/modules'
import type {
  AddStepAction,
  DuplicateMultipleStepsAction,
  DuplicateStepAction,
  SelectMultipleStepsAction,
  SelectStepAction,
  SelectTerminalItemAction,
} from '../../ui/steps'
import type {
  ChangeBatchEditFieldAction,
  SaveStepFormsMultiAction,
  ResetBatchEditFieldChangesAction,
} from '../actions'

vi.mock('../../labware-defs/utils')
vi.mock('../selectors')
vi.mock('../../steplist/formLevel/handleFormChange')
vi.mock('../utils/createPresavedStepForm')
vi.mock('../../utils/labwareModuleCompatibility')
vi.mock('../../utils')

afterEach(() => {
  vi.clearAllMocks()
})
describe('orderedStepIds reducer', () => {
  it('should add a saved step when that step is new', () => {
    const state = ['99']
    const action = {
      type: 'SAVE_STEP_FORM',
      payload: {
        id: '123',
        stepType: 'moveLiquid',
      },
    }
    expect(orderedStepIds(state, action)).toEqual(['99', '123'])
  })
  it('should not update when an existing step is saved', () => {
    const state = ['99', '123', '11']
    const action = {
      type: 'SAVE_STEP_FORM',
      payload: {
        id: '123',
        stepType: 'moveLiquid',
      },
    }
    expect(orderedStepIds(state, action)).toBe(state)
  })
  it('should remove a saved step when the step is deleted', () => {
    const state = ['1', '2', '3']
    const action = {
      type: 'DELETE_STEP',
      payload: '2',
    }
    expect(orderedStepIds(state, action)).toEqual(['1', '3'])
  })
  it('should remove multiple saved steps when multiple steps are deleted', () => {
    const state = ['1', '2', '3']
    const action = {
      type: 'DELETE_MULTIPLE_STEPS',
      payload: ['1', '3'],
    }
    expect(orderedStepIds(state, action)).toEqual(['2'])
  })
  it('should add a new step when the step is duplicated', () => {
    const state = ['1', '2', '3']
    const action = {
      type: 'DUPLICATE_STEP',
      payload: {
        stepId: '1',
        duplicateStepId: 'dup_1',
      },
    }
    expect(orderedStepIds(state, action)).toEqual(['1', 'dup_1', '2', '3'])
  })
  describe('duplicating multiple steps', () => {
    const steps = [
      {
        stepId: 'id1',
        duplicateStepId: 'dup_1',
      },
      {
        stepId: 'id2',
        duplicateStepId: 'dup_2',
      },
      {
        stepId: 'id3',
        duplicateStepId: 'dup_3',
      },
    ]
    const testCases = [
      {
        name: 'should add new steps at the 0th index',
        state: ['1', '2', '3'],
        action: {
          type: 'DUPLICATE_MULTIPLE_STEPS',
          payload: {
            steps: [...steps],
            indexToInsert: 0,
          },
        },
        expected: ['dup_1', 'dup_2', 'dup_3', '1', '2', '3'],
      },
      {
        name: 'should add new steps at the 2nd index',
        state: ['1', '2', '3'],
        action: {
          type: 'DUPLICATE_MULTIPLE_STEPS',
          payload: {
            steps: [...steps],
            indexToInsert: 2,
          },
        },
        expected: ['1', '2', 'dup_1', 'dup_2', 'dup_3', '3'],
      },
      {
        name: 'should add new steps at the last index',
        state: ['1', '2', '3'],
        action: {
          type: 'DUPLICATE_MULTIPLE_STEPS',
          payload: {
            steps: [...steps],
            indexToInsert: 3,
          },
        },
        expected: ['1', '2', '3', 'dup_1', 'dup_2', 'dup_3'],
      },
    ]
    testCases.forEach(({ name, state, action, expected }) => {
      it(name, () => {
        expect(orderedStepIds(state, action)).toEqual(expected)
      })
    })
  })
  describe('reorder steps', () => {
    const state = ['1', '2', '3', '4']
    const testCases = [
      {
        label: '+1 to first',
        payload: {
          delta: 1,
          stepId: '1',
        },
        expected: ['2', '1', '3', '4'],
      },
      {
        label: '+0 to first: no change',
        payload: {
          delta: 0,
          stepId: '1',
        },
        expected: state,
      },
      {
        label: '-1 to first: no change',
        payload: {
          delta: -1,
          stepId: '1',
        },
        expected: state,
      },
      {
        label: '-10 to first: no change',
        payload: {
          delta: -10,
          stepId: '1',
        },
        expected: state,
      },
      {
        label: '-1 to second',
        payload: {
          delta: -1,
          stepId: '2',
        },
        expected: ['2', '1', '3', '4'],
      },
      {
        label: '-10 to second',
        payload: {
          delta: -10,
          stepId: '2',
        },
        expected: ['2', '1', '3', '4'],
      },
      {
        label: '+1 to last: no change',
        payload: {
          delta: 1,
          stepId: '4',
        },
        expected: state,
      },
      {
        label: '+10 to last: no change',
        payload: {
          delta: 10,
          stepId: '4',
        },
        expected: state,
      },
    ]
    testCases.forEach(({ label, payload, expected }) => {
      it(label, () => {
        const action = {
          type: 'REORDER_SELECTED_STEP',
          payload,
        }
        expect(orderedStepIds(state, action)).toEqual(expected)
      })
    })
  })
})
describe('labwareInvariantProperties reducer', () => {
  it('replace custom labware def', () => {
    const prevState = {
      labwareIdA1: {
        labwareDefURI: 'foo/a/1',
      },
      labwareIdA2: {
        labwareDefURI: 'foo/a/1',
      },
      labwareIdB: {
        labwareDefURI: 'foo/b/1',
      },
    }
    const result = labwareInvariantProperties(prevState, {
      type: 'REPLACE_CUSTOM_LABWARE_DEF',
      payload: {
        defURIToOverwrite: 'foo/a/1',
        newDef: {
          parameters: {
            loadName: 'a',
          },
          version: 2,
          namespace: 'foo',
        },
        isOverwriteMismatched: false,
      },
    })
    expect(result).toEqual({
      // changed
      labwareIdA1: {
        labwareDefURI: 'foo/a/2',
      },
      labwareIdA2: {
        labwareDefURI: 'foo/a/2',
      },
      // unchanged
      labwareIdB: {
        labwareDefURI: 'foo/b/1',
      },
    })
  })
})

describe('moduleInvariantProperties reducer', () => {
  let prevState: Record<string, ModuleEntity>
  const existingModuleId = 'existingModuleId'
  const newId = 'newModuleId'
  beforeEach(() => {
    prevState = {
      [existingModuleId]: {
        id: existingModuleId,
        slot: '1',
        type: MAGNETIC_MODULE_TYPE,
        // @ts-expect-error(sa, 2021-6-14): not a valid magnetic module model
        model: 'someMagModel',
      },
    }
  })
  it('create module', () => {
    const newModuleData = {
      id: newId,
      slot: '3',
      type: TEMPERATURE_MODULE_TYPE,
      model: 'someTempModel',
    }
    const result = moduleInvariantProperties(prevState, {
      type: 'CREATE_MODULE',
      payload: newModuleData,
    })
    expect(result).toEqual({
      ...prevState,
      [newId]: {
        id: newId,
        type: newModuleData.type,
        model: newModuleData.model,
      },
    })
  })
  it('edit module (change its model)', () => {
    const newModel = 'someDifferentModel'
    const result = moduleInvariantProperties(prevState, {
      type: 'EDIT_MODULE',
      payload: {
        id: existingModuleId,
        model: newModel,
      },
    })
    expect(result).toEqual({
      [existingModuleId]: { ...prevState.existingModuleId, model: newModel },
    })
  })
  it('delete module', () => {
    const result = moduleInvariantProperties(prevState, {
      type: 'DELETE_MODULE',
      payload: {
        id: existingModuleId,
      },
    })
    expect(result).toEqual({})
  })
})
interface MakeDeckSetupStepArgs {
  labwareLocationUpdate?: Record<string, DeckSlot>
  pipetteLocationUpdate?: Record<string, DeckSlot>
  moduleLocationUpdate?: Record<string, DeckSlot>
}

const makeDeckSetupStep = (args: MakeDeckSetupStepArgs = {}): any => ({
  stepType: 'manualIntervention',
  id: '__INITIAL_DECK_SETUP_STEP__',
  labwareLocationUpdate: args.labwareLocationUpdate || {},
  pipetteLocationUpdate: args.pipetteLocationUpdate || {},
  moduleLocationUpdate: args.moduleLocationUpdate || {},
})

const makePrevRootState = (args?: MakeDeckSetupStepArgs): any => ({
  savedStepForms: {
    [INITIAL_DECK_SETUP_STEP_ID]: makeDeckSetupStep(args),
  },
})

describe('savedStepForms reducer: initial deck setup step', () => {
  const existingLabwareId = '_existingLabwareId'
  const otherLabwareId = '_otherLabwareId'
  const newLabwareId = '_newLabwareId'
  const moduleId = '_moduleId'
  const otherModuleId = '_otherModuleId'
  const labwareOnModuleId = '_labwareOnModuleId'
  describe('create (or duplicate) new labware', () => {
    const newSlot = '8'
    const testCases: Array<{
      testName: string
      action: SavedStepFormsActions
    }> = [
      {
        testName: 'duplicate labware',
        action: {
          type: 'DUPLICATE_LABWARE',
          payload: {
            templateLabwareId: existingLabwareId,
            duplicateLabwareId: newLabwareId,
            duplicateLabwareNickname: 'new labware nickname',
            slot: newSlot,
          },
        },
      },
      {
        testName: `create labware in slot ${newSlot}`,
        action: {
          type: 'CREATE_CONTAINER',
          payload: {
            slot: newSlot,
            labwareDefURI: 'fixtures/foo/1',
            id: newLabwareId,
          },
        },
      },
    ]
    testCases.forEach(({ testName, action }) => {
      it(testName, () => {
        const prevRootState = makePrevRootState({
          labwareLocationUpdate: {
            [existingLabwareId]: '1',
          },
        })
        const result = savedStepForms(prevRootState, action)
        expect(
          result[INITIAL_DECK_SETUP_STEP_ID].labwareLocationUpdate
        ).toEqual({
          [existingLabwareId]: '1',
          [newLabwareId]: newSlot,
        })
      })
    })
  })
  describe('move deck item', () => {
    const testCases: Array<{
      testName: string
      sourceSlot: DeckSlot
      destSlot: DeckSlot
      makeStateArgs: MakeDeckSetupStepArgs
      deckSetup?: any
      labwareIsCompatible?: boolean
      expectedLabwareLocations?: Record<string, any>
      expectedModuleLocations?: Record<string, any>
    }> = [
      {
        testName: 'move labware to empty slot -> simple move',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '1',
          },
        },
        expectedLabwareLocations: {
          [existingLabwareId]: '3',
        },
      },
      {
        testName: 'move labware to slot with labware -> swap labware',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '1',
            [otherLabwareId]: '3',
          },
        },
        expectedLabwareLocations: {
          [existingLabwareId]: '3',
          [otherLabwareId]: '1',
        },
      },
      {
        testName: 'move labware empty module -> labware added to module',
        sourceSlot: '1',
        destSlot: moduleId,
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '1',
          },
          moduleLocationUpdate: {
            [moduleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [existingLabwareId]: moduleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        // NOTE: if labware is incompatible, it's up to the UI to block this.
        testName:
          'move labware to slot with occupied module -> swap labware, module stays',
        sourceSlot: '1',
        destSlot: moduleId,
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '1',
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [existingLabwareId]: moduleId,
          [labwareOnModuleId]: '1',
        },
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        testName: 'move empty module to empty slot -> simple move',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {},
          moduleLocationUpdate: {
            [moduleId]: '1',
          },
        },
        expectedLabwareLocations: {},
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        testName:
          'move empty module to slot with incompatible labware -> swap slots, do not add labware to module',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '3',
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
          },
        },
        deckSetup: {
          labware: {
            [existingLabwareId]: {
              id: existingLabwareId,
              slot: '3',
              def: {
                foo: 'fake def',
              },
            },
          },
          pipettes: {},
          modules: {
            [moduleId]: {
              id: moduleId,
              type: MAGNETIC_MODULE_TYPE,
              model: MAGNETIC_MODULE_V2,
              slot: '1',
            },
          },
        },
        labwareIsCompatible: false,
        expectedLabwareLocations: {
          [existingLabwareId]: '1',
        },
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        testName:
          'move empty module to slot with compatible labware -> put module under labware',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '3',
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
          },
        },
        deckSetup: {
          labware: {
            [existingLabwareId]: {
              id: existingLabwareId,
              slot: '3',
              def: {
                foo: 'fake def',
              },
            },
          },
          pipettes: {},
          modules: {
            [moduleId]: {
              id: moduleId,
              type: MAGNETIC_MODULE_TYPE,
              model: MAGNETIC_MODULE_V2,
              slot: '1',
            },
          },
        },
        labwareIsCompatible: true,
        expectedLabwareLocations: {
          [existingLabwareId]: moduleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        testName:
          'move occupied module to slot with labware -> swap slots, do not change labware on module (even if compatible)',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [existingLabwareId]: '3',
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
          },
        },
        deckSetup: {
          labware: {
            [existingLabwareId]: {
              id: existingLabwareId,
              slot: '3',
              def: {
                foo: 'fake def',
              },
            },
            [labwareOnModuleId]: {
              id: labwareOnModuleId,
              slot: moduleId,
              def: {
                foo: 'fake def',
              },
            },
          },
          pipettes: {},
          modules: {
            [moduleId]: {
              id: moduleId,
              type: MAGNETIC_MODULE_TYPE,
              model: MAGNETIC_MODULE_V2,
              slot: '1',
            },
          },
        },
        labwareIsCompatible: true,
        expectedLabwareLocations: {
          [existingLabwareId]: '1',
          [labwareOnModuleId]: moduleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
        },
      },
      {
        testName: 'move labware off of module to empty slot',
        sourceSlot: moduleId,
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: '3',
        },
        expectedModuleLocations: {
          [moduleId]: '1',
        },
      },
      {
        testName: 'move empty module to occupied module -> swap, keep pairings',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: moduleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
          [otherModuleId]: '1',
        },
      },
      {
        testName: 'empty module to empty module -> swap',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {},
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '3',
          },
        },
        expectedLabwareLocations: {},
        expectedModuleLocations: {
          [moduleId]: '3',
          [otherModuleId]: '1',
        },
      },
      {
        testName: 'occupied module to occupied module -> swap, keep pairings',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
            [otherLabwareId]: otherModuleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: moduleId,
          [otherLabwareId]: otherModuleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
          [otherModuleId]: '1',
        },
      },
      {
        testName: 'occupied module to empty module -> swap, keep pairings',
        sourceSlot: '1',
        destSlot: '3',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: moduleId,
        },
        expectedModuleLocations: {
          [moduleId]: '3',
          [otherModuleId]: '1',
        },
      },
    ]
    testCases.forEach(
      ({
        testName,
        sourceSlot,
        destSlot,
        makeStateArgs,
        deckSetup,
        labwareIsCompatible,
        expectedLabwareLocations,
        expectedModuleLocations,
      }) => {
        it(testName, () => {
          vi.mocked(_getInitialDeckSetupRootState).mockReturnValue(deckSetup)
          vi.mocked(getLabwareIsCompatible).mockReturnValue(
            labwareIsCompatible as boolean
          )
          const prevRootState = makePrevRootState(makeStateArgs)
          const action = moveDeckItem(sourceSlot, destSlot)
          const result = savedStepForms(prevRootState, action)

          if (expectedLabwareLocations != null) {
            expect(
              result[INITIAL_DECK_SETUP_STEP_ID].labwareLocationUpdate
            ).toEqual(expectedLabwareLocations)
          }

          if (expectedModuleLocations != null) {
            expect(
              result[INITIAL_DECK_SETUP_STEP_ID].moduleLocationUpdate
            ).toEqual(expectedModuleLocations)
          }
        })
      }
    )
  })
  it('delete labware -> removes labware from initial deck setup step', () => {
    const labwareToDeleteId = '__labwareToDelete'
    const prevRootState = makePrevRootState({
      labwareLocationUpdate: {
        [existingLabwareId]: '1',
        [labwareToDeleteId]: '2',
      },
    })
    const action: DeleteContainerAction = {
      type: 'DELETE_CONTAINER',
      payload: {
        labwareId: labwareToDeleteId,
      },
    }
    const result = savedStepForms(prevRootState, action)
    expect(result[INITIAL_DECK_SETUP_STEP_ID].labwareLocationUpdate).toEqual({
      [existingLabwareId]: '1',
    })
  })
  it('delete pipettes -> removes pipette(s) from initial deck setup step', () => {
    const leftPipetteId = '__leftPipette'
    const rightPipetteId = '__rightPipette'
    const prevRootState = makePrevRootState({
      pipetteLocationUpdate: {
        [leftPipetteId]: 'left',
        [rightPipetteId]: 'right',
      },
    })
    const testCases = [
      {
        pipettesToDelete: [leftPipetteId],
        expected: {
          [rightPipetteId]: 'right',
        },
      },
      {
        pipettesToDelete: [leftPipetteId, rightPipetteId],
        expected: {},
      },
    ]
    testCases.forEach(({ pipettesToDelete, expected }) => {
      const action: DeletePipettesAction = {
        type: 'DELETE_PIPETTES',
        payload: pipettesToDelete,
      }
      const result = savedStepForms(prevRootState, action)
      expect(result[INITIAL_DECK_SETUP_STEP_ID].pipetteLocationUpdate).toEqual(
        expected
      )
    })
  })
  describe('create module', () => {
    describe('NO existing steps', () => {
      const destSlot = '3'
      const testCases = [
        {
          testName:
            'create module in empty deck slot (labware in unrelated slot unaffected)',
          makeStateArgs: {
            labwareLocationUpdate: {
              [existingLabwareId]: '6',
            },
          },
          expectedLabwareLocations: {
            [existingLabwareId]: '6',
          },
          expectedModuleLocations: {
            [moduleId]: destSlot,
          },
        },
        {
          testName:
            'create module in deck slot occupied with labware -> move that labware to the new module',
          makeStateArgs: {
            labwareLocationUpdate: {
              [existingLabwareId]: destSlot,
            },
          },
          expectedLabwareLocations: {
            [existingLabwareId]: moduleId,
          },
          expectedModuleLocations: {
            [moduleId]: destSlot,
          },
        },
      ]
      testCases.forEach(
        ({
          testName,
          makeStateArgs,
          expectedLabwareLocations,
          expectedModuleLocations,
        }) => {
          it(testName, () => {
            const action: CreateModuleAction = {
              type: 'CREATE_MODULE',
              payload: {
                id: moduleId,
                slot: destSlot,
                type: TEMPERATURE_MODULE_TYPE,
                // @ts-expect-error(sa, 2021-6-14): not a valid module model
                model: 'someTempModel',
              },
            }
            const prevRootState = makePrevRootState(makeStateArgs)
            const result = savedStepForms(prevRootState, action)
            expect(
              result[INITIAL_DECK_SETUP_STEP_ID].labwareLocationUpdate
            ).toEqual(expectedLabwareLocations)
            expect(
              result[INITIAL_DECK_SETUP_STEP_ID].moduleLocationUpdate
            ).toEqual(expectedModuleLocations)
          })
        }
      )
    })
    describe('existing steps', () => {
      let prevRootStateWithMagAndTCSteps: any
      beforeEach(() => {
        prevRootStateWithMagAndTCSteps = {
          savedStepForms: {
            ...makePrevRootState().savedStepForms,
            ...{
              mag_step_form_id: {
                stepType: 'magnet',
                moduleId: 'magdeckId',
              },
            },
            ...{
              TC_step_form_id: {
                stepType: 'thermocycler',
                moduleId: 'TCId',
              },
            },
          },
        }
      })
      const magneticStepCases: Array<{
        testName: string
        action: SavedStepFormsActions
        expectedModuleId: string
      }> = [
        {
          testName: 'create mag mod -> override mag step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'newMagdeckId',
              slot: '1',
              type: MAGNETIC_MODULE_TYPE,
              model: 'magneticModuleV1',
            },
          },
          expectedModuleId: 'newMagdeckId',
        },
        {
          testName: 'create temp mod -> DO NOT override mag step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'tempdeckId',
              slot: '1',
              type: TEMPERATURE_MODULE_TYPE,
              model: 'temperatureModuleV1',
            },
          },
          expectedModuleId: 'magdeckId',
        },
        {
          testName: 'create TC -> DO NOT override mag step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'ThermocyclerId',
              slot: '1',
              type: THERMOCYCLER_MODULE_TYPE,
              model: 'thermocyclerModuleV1',
            },
          },
          expectedModuleId: 'magdeckId',
        },
      ]
      const TCStepCases: Array<{
        testName: string
        action: SavedStepFormsActions
        expectedModuleId: string
      }> = [
        {
          testName: 'create TC -> override TC step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'NewTCId',
              slot: SPAN7_8_10_11_SLOT,
              type: THERMOCYCLER_MODULE_TYPE,
              model: 'thermocyclerModuleV1',
            },
          },
          expectedModuleId: 'NewTCId',
        },
        {
          testName: 'create temp mod -> DO NOT override TC step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'tempdeckId',
              slot: '1',
              type: TEMPERATURE_MODULE_TYPE,
              model: 'temperatureModuleV1',
            },
          },
          expectedModuleId: 'TCId',
        },
        {
          testName: 'create magnetic mod -> DO NOT override TC step module id',
          action: {
            type: 'CREATE_MODULE',
            payload: {
              id: 'newMagdeckId',
              slot: '1',
              type: MAGNETIC_MODULE_TYPE,
              model: 'magneticModuleV2',
            },
          },
          expectedModuleId: 'TCId',
        },
      ]
      magneticStepCases.forEach(({ testName, action, expectedModuleId }) => {
        it(testName, () => {
          const result = savedStepForms(prevRootStateWithMagAndTCSteps, action)
          // @ts-expect-error(sa, 2021-6-14): null check
          if (action.payload.type)
            expect(result.mag_step_form_id.moduleId).toBe(expectedModuleId)
        })
      })
      TCStepCases.forEach(({ testName, action, expectedModuleId }) => {
        it(testName, () => {
          const result = savedStepForms(prevRootStateWithMagAndTCSteps, action)
          // @ts-expect-error(sa, 2021-6-14): null check
          if (action.payload.type)
            expect(result.TC_step_form_id.moduleId).toBe(expectedModuleId)
        })
      })
    })
  })
  describe('delete module -> removes module from initial deck setup step', () => {
    const testCases: Array<{
      testName: string
      makeStateArgs: MakeDeckSetupStepArgs
      expectedLabwareLocations?: Record<string, any>
      expectedModuleLocations?: Record<string, any>
    }> = [
      {
        testName: 'delete unoccupied module',
        makeStateArgs: {
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '2',
          },
        },
        expectedLabwareLocations: {},
        expectedModuleLocations: {
          [otherModuleId]: '2',
        },
      },
      {
        testName: 'delete occupied module -> labware goes into its slot',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: '3',
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: '3',
        },
        expectedModuleLocations: {},
      },
      {
        testName:
          'delete occupied module in span7_8_10_11 slot -> labware goes into slot 7',
        makeStateArgs: {
          labwareLocationUpdate: {
            [labwareOnModuleId]: moduleId,
          },
          moduleLocationUpdate: {
            [moduleId]: SPAN7_8_10_11_SLOT,
          },
        },
        expectedLabwareLocations: {
          [labwareOnModuleId]: '7',
        },
        expectedModuleLocations: {},
      },
    ]
    testCases.forEach(
      ({
        testName,
        makeStateArgs,
        expectedLabwareLocations,
        expectedModuleLocations,
      }) => {
        it(testName, () => {
          const action: DeleteModuleAction = {
            type: 'DELETE_MODULE',
            payload: {
              id: moduleId,
            },
          }
          const prevRootState = makePrevRootState(makeStateArgs)
          const result = savedStepForms(prevRootState, action)
          expect(
            result[INITIAL_DECK_SETUP_STEP_ID].moduleLocationUpdate
          ).toEqual(expectedModuleLocations)
          expect(
            result[INITIAL_DECK_SETUP_STEP_ID].labwareLocationUpdate
          ).toEqual(expectedLabwareLocations)
        })
      }
    )
  })
  describe('delete module -> removes references to module from step forms', () => {
    const stepId = '_stepId'
    const action: DeleteModuleAction = {
      type: 'DELETE_MODULE',
      payload: {
        id: moduleId,
      },
    }

    const getPrevRootStateWithStep = (
      step: FormData
      // @ts-expect-error(sa, 2021-6-14): make this actually return RootState (add the rest of the state properties)
    ): RootState => ({
      savedStepForms: {
        [INITIAL_DECK_SETUP_STEP_ID]: makeDeckSetupStep({
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '2',
          },
        }),
        [stepId]: step,
      },
    })

    const testCases: Array<{ testName: string; step: FormData }> = [
      {
        testName: 'pause -> wait until temperature step',
        step: {
          id: stepId,
          stepType: 'pause',
          stepName: 'pause until 4C',
          stepDetails: 'some details',
          pauseAction: PAUSE_UNTIL_TEMP,
          pauseHour: null,
          pauseMinute: null,
          pauseSecond: null,
          pauseMessage: '',
          moduleId,
          pauseTemperature: '4',
        },
      },
      {
        testName: 'set temperature step',
        step: {
          id: stepId,
          stepType: 'temperature',
          stepName: 'temperature to 4',
          stepDetails: 'some details',
          moduleId,
          setTemperature: 'true',
          targetTemperature: '4',
        },
      },
      {
        testName: 'magnet step',
        step: {
          id: stepId,
          stepType: 'magnet',
          stepName: 'engage magnet',
          stepDetails: 'some details',
          moduleId,
          magnetAction: 'engage',
          engageHeight: '4',
        },
      },
    ]
    testCases.forEach(({ testName, step }) => {
      it(testName, () => {
        const result = savedStepForms(getPrevRootStateWithStep(step), action)
        expect(result[stepId]).toEqual({ ...step, moduleId: null })
      })
    })
  })
  describe('deleting steps', () => {
    let savedStepFormsState: {
      [id: string]: {
        stepType: StepType
        id: string
      }
    }
    beforeEach(() => {
      savedStepFormsState = {
        [INITIAL_DECK_SETUP_STEP_ID]: makeDeckSetupStep({
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '2',
          },
        }),
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id1: {
          id: 'id1',
        },
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id2: {
          id: 'id2',
        },
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id3: {
          id: 'id3',
        },
      }
    })
    it('should delete one step', () => {
      const action = {
        type: 'DELETE_STEP',
        payload: 'id1',
      }
      const expectedState = { ...savedStepFormsState }
      delete expectedState.id1
      expect(
        savedStepForms(
          // @ts-expect-error(sa, 2021-6-14): add missing keys to savedStepFormsState
          {
            savedStepForms: savedStepFormsState,
          },
          action
        )
      ).toEqual(expectedState)
    })
    it('should delete multiple steps', () => {
      const action = {
        type: 'DELETE_MULTIPLE_STEPS',
        payload: ['id1', 'id2'],
      }
      const expectedState = { ...savedStepFormsState }
      delete expectedState.id1
      delete expectedState.id2
      expect(
        savedStepForms(
          // @ts-expect-error(sa, 2021-6-14): add missing keys to savedStepFormsState
          {
            savedStepForms: savedStepFormsState,
          },
          action
        )
      ).toEqual(expectedState)
    })
  })
  describe('duplicating steps', () => {
    let savedStepFormsState: {
      [id: string]: {
        stepType: StepType
        id: string
      }
    }
    beforeEach(() => {
      savedStepFormsState = {
        [INITIAL_DECK_SETUP_STEP_ID]: makeDeckSetupStep({
          moduleLocationUpdate: {
            [moduleId]: '1',
            [otherModuleId]: '2',
          },
        }),
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id1: {
          id: 'id1',
        },
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id2: {
          id: 'id2',
        },
        // @ts-expect-error(sa, 2021-6-14): add stepTypes to these test fixtures
        id3: {
          id: 'id3',
        },
      }
    })
    it('should duplicate one step', () => {
      const action: DuplicateStepAction = {
        type: 'DUPLICATE_STEP',
        payload: {
          stepId: 'id1',
          duplicateStepId: 'dup_1',
        },
      }
      const expectedState = {
        ...savedStepFormsState,
        dup_1: {
          id: 'dup_1',
        },
      }
      expect(
        savedStepForms(
          // @ts-expect-error(sa, 2021-6-14): add missing keys to savedStepFormsState
          {
            savedStepForms: savedStepFormsState,
          },
          action
        )
      ).toEqual(expectedState)
    })
    it('should duplicate multiple steps', () => {
      const action = {
        type: 'DUPLICATE_MULTIPLE_STEPS',
        payload: {
          steps: [
            {
              stepId: 'id1',
              duplicateStepId: 'dup_1',
            },
            {
              stepId: 'id2',
              duplicateStepId: 'dup_2',
            },
            {
              stepId: 'id3',
              duplicateStepId: 'dup_3',
            },
          ],
          indexToInsert: 0, // this does not matter for this reducer
        },
      }
      const expectedState = {
        ...savedStepFormsState,
        dup_1: {
          id: 'dup_1',
        },
        dup_2: {
          id: 'dup_2',
        },
        dup_3: {
          id: 'dup_3',
        },
      }
      expect(
        savedStepForms(
          // @ts-expect-error(sa, 2021-6-14): add missing keys to savedStepFormsState
          {
            savedStepForms: savedStepFormsState,
          },
          action
        )
      ).toEqual(expectedState)
    })
  })
  describe('EDIT_MODULE', () => {
    it('should set engageHeight to null for all Magnet > Engage steps when a magnet module has its model changed, unless height matches default', () => {
      vi.mocked(_getInitialDeckSetupRootState).mockReturnValue({
        labware: {
          magPlateId: {
            id: 'magPlateId',
            slot: 'magModuleId',
            def: {
              // @ts-expect-error(sa, 2021-6-14): add missing parameters to fixture
              parameters: {
                magneticModuleEngageHeight: 12,
              },
            },
          },
        },
        pipettes: {},
        modules: {
          // @ts-expect-error(sa, 2021-6-14): add missing parameters to fixture
          magModuleId: {
            id: 'magModuleId',
            type: MAGNETIC_MODULE_TYPE,
            model: MAGNETIC_MODULE_V1,
            slot: '1',
          },
        },
      })
      const action: EditModuleAction = {
        type: 'EDIT_MODULE',
        payload: {
          id: 'magModuleId',
          model: 'magneticModuleV2',
        },
      }
      const prevRootState: RootState = {
        savedStepForms: {
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          magnetEngageStepId: {
            stepType: 'magnet',
            magnetAction: 'engage',
            moduleId: 'magModuleId',
            engageHeight: '24', // = 12 * 2 b/c we're going V1 -> V2
          },
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          magnetDisengageStepId: {
            stepType: 'magnet',
            magnetAction: 'disengage',
            engageHeight: null,
            moduleId: 'magModuleId',
          },
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          nonDefaultMagnetEngageStepId: {
            stepType: 'magnet',
            magnetAction: 'engage',
            moduleId: 'magModuleId',
            engageHeight: '8',
          },
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          unrelatedMagnetEngageStepId: {
            stepType: 'magnet',
            magnetAction: 'engage',
            moduleId: 'otherMagModuleId',
            // not 'magModuleId'
            engageHeight: '8',
          },
        },
      }
      const result = savedStepForms(prevRootState, action)
      expect(result).toEqual({
        magnetEngageStepId: {
          stepType: 'magnet',
          magnetAction: 'engage',
          engageHeight: '12',
          // V2 units default
          moduleId: 'magModuleId',
        },
        magnetDisengageStepId:
          prevRootState.savedStepForms.magnetDisengageStepId,
        nonDefaultMagnetEngageStepId: {
          stepType: 'magnet',
          magnetAction: 'engage',
          moduleId: 'magModuleId',
          engageHeight: null,
        },
        // module id not matching, unchanged
        unrelatedMagnetEngageStepId:
          prevRootState.savedStepForms.unrelatedMagnetEngageStepId,
      })
    })
  })
  describe('saving multiple steps', () => {
    it('should apply the form patch to all of the step ids', () => {
      const prevState: RootState = {
        savedStepForms: {
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          some_transfer_step_id: {
            stepType: 'moveLiquid',
            blowout_location: 'someLocation',
            dispense_mix_checkbox: true,
            dispense_mix_volume: '10',
          },
          // @ts-expect-error(sa, 2021-6-14): add id to fixture
          another_transfer_step_id: {
            stepType: 'moveLiquid',
            blowout_location: 'anotherLocation',
            dispense_mix_checkbox: true,
            dispense_mix_volume: '20',
          },
        },
      }
      const action: SaveStepFormsMultiAction = {
        type: 'SAVE_STEP_FORMS_MULTI',
        payload: {
          editedFields: {
            blowout_location: 'newLocation',
            dispense_mix_volume: '30',
          },
          stepIds: ['some_transfer_step_id', 'another_transfer_step_id'],
        },
      }
      const expectedSavedStepFormState = {
        some_transfer_step_id: {
          stepType: 'moveLiquid',
          blowout_location: 'newLocation',
          dispense_mix_checkbox: true,
          dispense_mix_volume: '30',
        },
        another_transfer_step_id: {
          stepType: 'moveLiquid',
          blowout_location: 'newLocation',
          dispense_mix_checkbox: true,
          dispense_mix_volume: '30',
        },
      }
      expect(savedStepForms(prevState, action)).toEqual(
        expectedSavedStepFormState
      )
    })
  })
})
describe('unsavedForm reducer', () => {
  const someState: any = {
    unsavedForm: 'foo',
  }
  it('should take on the payload of the POPULATE_FORM action', () => {
    const payload = {
      formStuff: 'example',
    }
    const result = unsavedForm(someState, {
      type: 'POPULATE_FORM',
      // @ts-expect-error(sa, 2021-6-14): not a valid FormData payload
      payload,
    })
    expect(result).toEqual(payload)
  })
  it('should use handleFormChange to update the state with CHANGE_FORM_INPUT action', () => {
    const rootState: any = {
      unsavedForm: {
        existingField: 123,
      },
    }
    const action: ChangeFormInputAction = {
      type: 'CHANGE_FORM_INPUT',
      payload: {
        update: {
          someField: -1,
        },
      },
    }
    vi.mocked(handleFormChange).mockReturnValue({
      someField: 42,
    })
    vi.mocked(_getPipetteEntitiesRootState).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not a valid PipetteEntities Type
      'pipetteEntitiesPlaceholder'
    )
    vi.mocked(_getLabwareEntitiesRootState).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not a valid LabwareEntities Type
      'labwareEntitiesPlaceholder'
    )
    const result = unsavedForm(rootState, action)
    expect(vi.mocked(_getPipetteEntitiesRootState).mock.calls).toEqual([
      [rootState],
    ])
    expect(vi.mocked(_getLabwareEntitiesRootState).mock.calls).toEqual([
      [rootState],
    ])
    expect(vi.mocked(handleFormChange).mock.calls).toEqual([
      [
        action.payload.update,
        rootState.unsavedForm,
        'pipetteEntitiesPlaceholder',
        'labwareEntitiesPlaceholder',
      ],
    ])
    expect(result).toEqual({
      existingField: 123,
      someField: 42,
    })
  })
  it("should switch out pipettes via handleFormChange in response to SUBSTITUTE_STEP_FORM_PIPETTES if the unsaved form's ID is in range", () => {
    const action: SubstituteStepFormPipettesAction = {
      type: 'SUBSTITUTE_STEP_FORM_PIPETTES',
      payload: {
        substitutionMap: {
          oldPipetteId: 'newPipetteId',
        },
        startStepId: '3',
        endStepId: '5',
      },
    }
    const rootState: RootState = {
      orderedStepIds: ['1', '3', '4', '5', '6'],
      // @ts-expect-error(sa, 2021-6-14): add stepType to fixture
      unsavedForm: {
        pipette: 'oldPipetteId',
        id: '4',
        otherField: 'blah',
      },
    }
    vi.mocked(handleFormChange).mockReturnValue({
      pipette: 'newPipetteId',
    })
    vi.mocked(_getPipetteEntitiesRootState).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not a valid PipetteEntities Type
      'pipetteEntitiesPlaceholder'
    )
    vi.mocked(_getLabwareEntitiesRootState).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not a valid LabwareEntities Type
      'labwareEntitiesPlaceholder'
    )
    const result = unsavedForm(rootState, action)
    expect(vi.mocked(_getPipetteEntitiesRootState).mock.calls).toEqual([
      [rootState],
    ])
    expect(vi.mocked(_getLabwareEntitiesRootState).mock.calls).toEqual([
      [rootState],
    ])
    expect(vi.mocked(handleFormChange).mock.calls).toEqual([
      [
        {
          pipette: 'newPipetteId',
        },
        rootState.unsavedForm,
        'pipetteEntitiesPlaceholder',
        'labwareEntitiesPlaceholder',
      ],
    ])
    expect(result).toEqual({
      id: '4',
      pipette: 'newPipetteId',
      otherField: 'blah',
    })
  })
  const actionTypes: Array<UnsavedFormActions['type']> = [
    'CANCEL_STEP_FORM',
    'CREATE_MODULE',
    'DELETE_MODULE',
    'DELETE_STEP',
    'DELETE_MULTIPLE_STEPS',
    'EDIT_MODULE',
    'SAVE_STEP_FORM',
    'SELECT_TERMINAL_ITEM',
    'SELECT_MULTIPLE_STEPS',
    'TOGGLE_IS_GRIPPER_REQUIRED',
  ]
  actionTypes.forEach(actionType => {
    it(`should clear the unsaved form when any ${actionType} action is dispatched`, () => {
      const result = unsavedForm(someState, {
        type: actionType,
      } as any)
      expect(result).toEqual(null)
    })
  })
  it('should return the result createPresavedStepForm util upon ADD_STEP action', () => {
    vi.mocked(createPresavedStepForm).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not a valid FormData Type
      'createPresavedStepFormMockResult'
    )
    vi.mocked(_getInitialDeckSetupRootState).mockReturnValue(
      // @ts-expect-error(sa, 2021-6-14): not valid InitialDeckSetup state
      'initalDeckSetupValue'
    )
    const stateMock: RootState = {
      // @ts-expect-error(sa, 2021-6-14): not valid savedStepForms state
      savedStepForms: 'savedStepFormsValue',
      // @ts-expect-error(sa, 2021-6-14): not valid orderedStepIds state
      orderedStepIds: 'orderedStepIdsValue',
    }
    const result = unsavedForm(stateMock, {
      type: 'ADD_STEP',
      payload: {
        id: 'stepId123',
        stepType: 'moveLiquid',
      },
      meta: {
        // @ts-expect-error(sa, 2021-6-14): not valid Timeline state
        robotStateTimeline: 'robotStateTimelineValue',
      },
    })
    expect(result).toEqual('createPresavedStepFormMockResult')
    expect(vi.mocked(createPresavedStepForm).mock.calls).toEqual([
      [
        {
          stepId: 'stepId123',
          stepType: 'moveLiquid',
          pipetteEntities: 'pipetteEntitiesPlaceholder',
          labwareEntities: 'labwareEntitiesPlaceholder',
          savedStepForms: 'savedStepFormsValue',
          orderedStepIds: 'orderedStepIdsValue',
          initialDeckSetup: 'initalDeckSetupValue',
          robotStateTimeline: 'robotStateTimelineValue',
        },
      ],
    ])
  })
})
describe('presavedStepForm reducer', () => {
  it('should populate when a new step is added', () => {
    const addStepAction: AddStepAction = {
      type: 'ADD_STEP',
      payload: {
        id: 'someId',
        // @ts-expect-error(sa, 2021-6-14): transfer is not a valid stepType, change to moveLiquid
        stepType: 'transfer',
      },
    }
    const result = presavedStepForm(null, addStepAction)
    expect(result).toEqual({
      stepType: 'transfer',
    })
  })
  it('should not update when the PRESAVED_STEP_ID terminal item is selected', () => {
    const prevState: PresavedStepFormState = {
      // @ts-expect-error(sa, 2021-6-14): transfer is not a valid stepType, change to moveLiquid
      stepType: 'transfer',
    }
    const action: SelectTerminalItemAction = {
      type: 'SELECT_TERMINAL_ITEM',
      payload: PRESAVED_STEP_ID,
    }
    expect(presavedStepForm(prevState, action)).toBe(prevState)
  })
  it('should clear when a different terminal item is selected', () => {
    const prevState: PresavedStepFormState = {
      // @ts-expect-error(sa, 2021-6-14): transfer is not a valid stepType, change to moveLiquid
      stepType: 'transfer',
    }
    const action: SelectTerminalItemAction = {
      type: 'SELECT_TERMINAL_ITEM',
      // @ts-expect-error(sa, 2021-6-14): transfer is not a valid TerminalItemId
      payload: 'otherId',
    }
    expect(presavedStepForm(prevState, action)).toEqual(null)
  })
  const clearingActions: Array<PresavedStepFormAction['type']> = [
    'CANCEL_STEP_FORM',
    'DELETE_STEP',
    'DELETE_MULTIPLE_STEPS',
    'SAVE_STEP_FORM',
    'SELECT_STEP',
    'SELECT_MULTIPLE_STEPS',
  ]
  clearingActions.forEach(actionType => {
    it(`should clear upon ${actionType}`, () => {
      const prevState: PresavedStepFormState = {
        id: 'someId',
        // @ts-expect-error(sa, 2021-6-14): transfer is not a valid stepType, change to moveLiquid
        stepType: 'transfer',
      }
      expect(
        // @ts-expect-error(sa, 2021-6-14): missing payload
        presavedStepForm(prevState, {
          type: actionType,
        })
      ).toEqual(null)
    })
  })
})
describe('batchEditFormChanges reducer', () => {
  it('should add the new fields into empty state on CHANGE_BATCH_EDIT_FIELD', () => {
    const state = {}
    const action: ChangeBatchEditFieldAction = {
      type: 'CHANGE_BATCH_EDIT_FIELD',
      payload: {
        someFieldName: 'someFieldValue',
      },
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({
      someFieldName: 'someFieldValue',
    })
  })
  it('should add the new fields into existing state on CHANGE_BATCH_EDIT_FIELD', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    const action: ChangeBatchEditFieldAction = {
      type: 'CHANGE_BATCH_EDIT_FIELD',
      payload: {
        anotherFieldName: 'anotherFieldValue',
      },
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({
      someFieldName: 'someFieldValue',
      anotherFieldName: 'anotherFieldValue',
    })
  })
  it('should reset state on RESET_BATCH_EDIT_FIELD_CHANGES', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    const action: ResetBatchEditFieldChangesAction = {
      type: 'RESET_BATCH_EDIT_FIELD_CHANGES',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
  it('should reset state on SAVE_STEP_FORMS_MULTI', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    // @ts-expect-error(sa, 2021-6-14): missing payload
    const action: SaveStepFormsMultiAction = {
      type: 'SAVE_STEP_FORMS_MULTI',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
  it('should reset state on SELECT_STEP', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    // @ts-expect-error(sa, 2021-6-14): missing payload
    const action: SelectStepAction = {
      type: 'SELECT_STEP',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
  it('should reset state on SELECT_MULTIPLE_STEPS', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    // @ts-expect-error(sa, 2021-6-14): missing payload
    const action: SelectMultipleStepsAction = {
      type: 'SELECT_MULTIPLE_STEPS',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
  it('should reset state on DUPLICATE_MULTIPLE_STEPS', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    // @ts-expect-error(sa, 2021-6-14): missing payload
    const action: DuplicateMultipleStepsAction = {
      type: 'DUPLICATE_MULTIPLE_STEPS',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
  it('should reset state on DELETE_MULTIPLE_STEPS', () => {
    const state = {
      someFieldName: 'someFieldValue',
    }
    // @ts-expect-error(sa, 2021-6-14): missing payload
    const action: DeleteMultipleStepsAction = {
      type: 'DELETE_MULTIPLE_STEPS',
    }
    expect(batchEditFormChanges(state, { ...action })).toEqual({})
  })
})
