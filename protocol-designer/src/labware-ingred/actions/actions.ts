import { createAction } from 'redux-actions'
import { getLiquidEntities } from '../../step-forms/selectors'
import { selectors } from '../selectors'
import type { StepFieldName } from '../../form-types'
import type { DeckSlot, ThunkAction } from '../../types'
import type { Fixture, IngredInputs } from '../types'
import type { CutoutId, ModuleModel } from '@opentrons/shared-data'

// ===== Labware selector actions =====
export interface OpenAddLabwareModalAction {
  type: 'OPEN_ADD_LABWARE_MODAL'
  payload: {
    slot: DeckSlot
  }
}
// @ts-expect-error(sa, 2021-6-20): creatActions doesn't return exact actions
export const openAddLabwareModal: (payload: {
  slot: DeckSlot
}) => OpenAddLabwareModalAction = createAction('OPEN_ADD_LABWARE_MODAL')
export interface CloseLabwareSelectorAction {
  type: 'CLOSE_LABWARE_SELECTOR'
}
// @ts-expect-error(mc, 2020-06-04): creatActions doesn't return exact actions
export const closeLabwareSelector: () => CloseLabwareSelectorAction = createAction(
  'CLOSE_LABWARE_SELECTOR'
)
// ===== Open and close Ingredient Selector modal ====
export interface OpenIngredientSelectorAction {
  type: 'OPEN_INGREDIENT_SELECTOR'
  payload: string
}
// @ts-expect-error(sa, 2021-6-20): creatActions doesn't return exact actions
export const openIngredientSelector: (
  payload: string
) => OpenIngredientSelectorAction = createAction('OPEN_INGREDIENT_SELECTOR')
export interface CloseIngredientSelectorAction {
  type: 'CLOSE_INGREDIENT_SELECTOR'
}
// @ts-expect-error(mc, 2020-06-04): creatActions doesn't return exact actions
export const closeIngredientSelector: () => CloseIngredientSelectorAction = createAction(
  'CLOSE_INGREDIENT_SELECTOR'
)
// ===== Drill Down on Labware ====
export interface DrillDownOnLabwareAction {
  type: 'DRILL_DOWN_ON_LABWARE'
  payload: string
}
// @ts-expect-error(sa, 2021-6-20): creatActions doesn't return exact actions
export const drillDownOnLabware: (
  payload: string
) => DrillDownOnLabwareAction = createAction('DRILL_DOWN_ON_LABWARE')
export interface DrillUpFromLabwareAction {
  type: 'DRILL_UP_FROM_LABWARE'
}
// @ts-expect-error(mc, 2020-06-04): creatActions doesn't return exact actions
export const drillUpFromLabware: () => DrillUpFromLabwareAction = createAction(
  'DRILL_UP_FROM_LABWARE'
)
// ==== Create/delete/modify labware =====
export interface CreateContainerArgs {
  labwareDefURI: string
  // NOTE: adapterUnderLabwareDefURI is only for rendering an adapter under the labware/tiprack
  adapterUnderLabwareDefURI?: string
  // NOTE: if slot is omitted, next available slot will be used.
  slot?: DeckSlot
}
export interface CreateContainerAction {
  type: 'CREATE_CONTAINER'
  payload: CreateContainerArgs & {
    slot: DeckSlot
    id: string
  }
}
export interface DeleteContainerAction {
  type: 'DELETE_CONTAINER'
  payload: {
    labwareId: string
  }
}
// @ts-expect-error(sa, 2021-6-20): creatActions doesn't return exact actions
export const deleteContainer: (payload: {
  labwareId: string
}) => DeleteContainerAction = createAction('DELETE_CONTAINER')
// ===========
export interface SwapSlotContentsAction {
  type: 'MOVE_DECK_ITEM'
  payload: {
    sourceSlot: DeckSlot
    destSlot: DeckSlot
  }
}
// TODO: Ian 2019-01-24 later, this should work on stepId or a range of steps.
// We could follow the pattern of SubstituteStepFormPipettesAction.
export const moveDeckItem = (
  sourceSlot: DeckSlot,
  destSlot: DeckSlot
): SwapSlotContentsAction => ({
  type: 'MOVE_DECK_ITEM',
  payload: {
    sourceSlot,
    destSlot,
  },
})
export interface DuplicateLabwareAction {
  type: 'DUPLICATE_LABWARE'
  payload: {
    templateLabwareId: string
    duplicateLabwareId: string
    duplicateLabwareNickname: string
    slot: DeckSlot
  }
}

export interface RemoveWellsContentsAction {
  type: 'REMOVE_WELLS_CONTENTS'
  payload: {
    labwareId: string
    liquidGroupId?: string
    wells: string[]
  }
}
export const removeWellsContents: (
  payload: RemoveWellsContentsAction['payload']
) => RemoveWellsContentsAction = payload => ({
  type: 'REMOVE_WELLS_CONTENTS',
  payload,
})

export interface EditMultipleLiquidGroupsAction {
  type: 'EDIT_MULTIPLE_LIQUID_GROUPS_PYTHON_NAME'
  payload: Record<string, IngredInputs> // Updated liquid group pythonName
}

export interface DeleteLiquidGroupAction {
  type: 'DELETE_LIQUID_GROUP'
  payload: string // liquid group id
}
export const deleteLiquidGroup: (
  liquidGroupId: string
) => ThunkAction<
  DeleteLiquidGroupAction | EditMultipleLiquidGroupsAction
> = liquidGroupId => (dispatch, getState) => {
  const allLiquidGroups = selectors.getLiquidGroupsOnDeck(getState())
  const liquidEntities = getLiquidEntities(getState())
  const liquidIsOnDeck = allLiquidGroups.includes(liquidGroupId)

  if (!Object.keys(allLiquidGroups).includes(liquidGroupId)) {
    return
  }

  const okToDelete = liquidIsOnDeck
    ? global.confirm(
        'This liquid has been placed on the deck, are you sure you want to delete it?'
      )
    : true

  if (!okToDelete) {
    return
  }

  // filter out the deleted group and create an updated liquid entities object
  const { [liquidGroupId]: _, ...remainingLiquidEntities } = liquidEntities

  const updatedLiquidGroupPythonName = Object.keys(remainingLiquidEntities)
    .sort() //  sort to ensure correct order
    .reduce<Record<string, IngredInputs>>((acc, oldId, index) => {
      acc[oldId] = {
        ...remainingLiquidEntities[oldId],
        pythonName: `liquid_${index + 1}`,
      }
      return acc
    }, {})

  //  delete user selected group, then update pythonName for rest of liquids
  dispatch({ type: 'DELETE_LIQUID_GROUP', payload: liquidGroupId })
  dispatch({
    type: 'EDIT_MULTIPLE_LIQUID_GROUPS_PYTHON_NAME',
    payload: updatedLiquidGroupPythonName,
  })
}

// NOTE: assumes you want to set a uniform volume of the same liquid in one labware
export interface SetWellContentsPayload {
  liquidGroupId: string
  labwareId: string
  wells: string[]
  // NOTE: order should not be meaningful
  volume: number
}
export interface SetWellContentsAction {
  type: 'SET_WELL_CONTENTS'
  payload: SetWellContentsPayload
}
export const setWellContents = (
  payload: SetWellContentsPayload
): SetWellContentsAction => ({
  type: 'SET_WELL_CONTENTS',
  payload,
})
export interface SelectLiquidAction {
  type: 'SELECT_LIQUID_GROUP'
  payload: string
}
export function selectLiquidGroup(liquidGroupId: string): SelectLiquidAction {
  return {
    type: 'SELECT_LIQUID_GROUP',
    payload: liquidGroupId,
  }
}
export interface DeselectLiquidGroupAction {
  type: 'DESELECT_LIQUID_GROUP'
}
export function deselectLiquidGroup(): DeselectLiquidGroupAction {
  return {
    type: 'DESELECT_LIQUID_GROUP',
  }
}
export interface CreateNewLiquidGroupAction {
  type: 'CREATE_NEW_LIQUID_GROUP_FORM'
}
export function createNewLiquidGroup(): CreateNewLiquidGroupAction {
  return {
    type: 'CREATE_NEW_LIQUID_GROUP_FORM',
  }
}
export interface EditLiquidGroupAction {
  type: 'EDIT_LIQUID_GROUP'
  payload: IngredInputs & {
    liquidGroupId: string
  }
}
// NOTE: with no ID, a new one is assigned
export const editLiquidGroup: (
  args: IngredInputs
) => ThunkAction<EditLiquidGroupAction> = args => (dispatch, getState) => {
  const { liquidGroupId, ...payloadArgs } = args // NOTE: separate liquidGroupId for flow to understand unpacking :/

  dispatch({
    type: 'EDIT_LIQUID_GROUP',
    payload: {
      ...payloadArgs,
      liquidGroupId:
        args.liquidGroupId || selectors.getNextLiquidGroupId(getState()),
    },
  })
}

//  NOTE: the following actions are for selecting labware/hardware for the zoomed in slot
export interface SelectLabwareAction {
  type: 'SELECT_LABWARE'
  payload: {
    labwareDefUri: string | null
  }
}
export const selectLabware: (
  payload: SelectLabwareAction['payload']
) => SelectLabwareAction = payload => ({
  type: 'SELECT_LABWARE',
  payload,
})
export interface SelectNestedLabwareAction {
  type: 'SELECT_NESTED_LABWARE'
  payload: {
    nestedLabwareDefUri: string | null
  }
}
export const selectNestedLabware: (
  payload: SelectNestedLabwareAction['payload']
) => SelectNestedLabwareAction = payload => ({
  type: 'SELECT_NESTED_LABWARE',
  payload,
})

export interface SelectModuleAction {
  type: 'SELECT_MODULE'
  payload: {
    moduleModel: ModuleModel | null
  }
}
export const selectModule: (
  payload: SelectModuleAction['payload']
) => SelectModuleAction = payload => ({
  type: 'SELECT_MODULE',
  payload,
})

export interface SelectFixtureAction {
  type: 'SELECT_FIXTURE'
  payload: {
    fixture: Fixture | null
  }
}
export const selectFixture: (
  payload: SelectFixtureAction['payload']
) => SelectFixtureAction = payload => ({
  type: 'SELECT_FIXTURE',
  payload,
})

export interface ZoomedIntoSlotAction {
  type: 'ZOOMED_INTO_SLOT'
  payload: {
    slot: DeckSlot | null
    cutout: CutoutId | null
  }
}
export const selectZoomedIntoSlot: (
  payload: ZoomedIntoSlotAction['payload']
) => ZoomedIntoSlotAction = payload => ({
  type: 'ZOOMED_INTO_SLOT',
  payload,
})

export interface GenerateNewProtocolAction {
  type: 'GENERATE_NEW_PROTOCOL'
  payload: {
    isNewProtocol: boolean
  }
}
export const generateNewProtocol: (
  payload: GenerateNewProtocolAction['payload']
) => GenerateNewProtocolAction = payload => ({
  type: 'GENERATE_NEW_PROTOCOL',
  payload,
})

export interface RenameStepAction {
  type: 'CHANGE_STEP_DETAILS'
  payload: {
    stepId?: string
    update: Partial<Record<StepFieldName, unknown | null>>
  }
}

export const renameStep: (
  payload: RenameStepAction['payload']
) => RenameStepAction = payload => ({
  type: 'CHANGE_STEP_DETAILS',
  payload,
})
