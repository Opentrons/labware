import { getIsTiprack } from '@opentrons/shared-data'
import { uuid } from '../../utils'
import { selectors as labwareDefSelectors } from '../../labware-defs'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import { getNextAvailableDeckSlot, getNextNickname } from '../utils'
import { getRobotType } from '../../file-data/selectors'
import {
  selectNestedLabware,
  selectLabware,
  selectModule,
  selectFixture,
} from './actions'
import type { LabwareOnDeck, ModuleOnDeck } from '../../step-forms'
import type {
  CreateContainerArgs,
  CreateContainerAction,
  DuplicateLabwareAction,
  SelectNestedLabwareAction,
  SelectLabwareAction,
  SelectModuleAction,
  SelectFixtureAction,
} from './actions'
import type { ThunkAction } from '../../types'
import type { Fixture } from '../types'

export interface RenameLabwareAction {
  type: 'RENAME_LABWARE'
  payload: {
    labwareId: string
    name?: string | null
  }
}
export const renameLabware: (
  args: RenameLabwareAction['payload']
) => ThunkAction<CreateContainerAction | RenameLabwareAction> = args => (
  dispatch,
  getState
) => {
  const { labwareId } = args
  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(
    getState()
  )
  const defaultNickname = allNicknamesById[labwareId]
  const nextNickname = getNextNickname(
    // NOTE: flow won't do Object.values here >:(
    Object.keys(allNicknamesById)
      .filter((id: string) => id !== labwareId) // <- exclude the about-to-be-renamed labware from the nickname list
      .map((id: string) => allNicknamesById[id]),
    args.name || defaultNickname
  )
  return dispatch({
    type: 'RENAME_LABWARE',
    payload: {
      labwareId,
      name: nextNickname,
    },
  })
}
export const createContainer: (
  args: CreateContainerArgs
) => ThunkAction<CreateContainerAction | RenameLabwareAction> = args => (
  dispatch,
  getState
) => {
  const state = getState()
  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const robotType = getRobotType(state)
  const labwareDef = labwareDefSelectors.getLabwareDefsByURI(state)[
    args.labwareDefURI
  ]
  const slot =
    args.slot ||
    getNextAvailableDeckSlot(initialDeckSetup, robotType, labwareDef)
  const isTiprack = getIsTiprack(labwareDef)
  if (slot) {
    const id = `${uuid()}:${args.labwareDefURI}`
    const adapterId =
      args.adapterUnderLabwareDefURI != null
        ? `${uuid()}:${args.adapterUnderLabwareDefURI}`
        : null

    if (adapterId != null && args.adapterUnderLabwareDefURI != null) {
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: {
          ...args,
          labwareDefURI: args.adapterUnderLabwareDefURI,
          id: adapterId,
          slot,
        },
      })
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: {
          ...args,
          id,
          slot: adapterId,
        },
      })
    } else {
      dispatch({
        type: 'CREATE_CONTAINER',
        payload: { ...args, id, slot },
      })
    }
    if (isTiprack) {
      // Tipracks cannot be named, but should auto-increment.
      // We can't rely on reducers to do that themselves bc they don't have access
      // to both the nickname state and the isTiprack condition
      renameLabware({
        labwareId: id,
      })(dispatch, getState)
    }
  } else {
    console.warn('no slots available, cannot create labware')
  }
}

export const duplicateLabware: (
  templateLabwareId: string
) => ThunkAction<DuplicateLabwareAction> = templateLabwareId => (
  dispatch,
  getState
) => {
  const state = getState()
  const robotType = state.fileData.robotType
  const templateLabwareDefURI = stepFormSelectors.getLabwareEntities(state)[
    templateLabwareId
  ].labwareDefURI
  console.assert(
    templateLabwareDefURI,
    `no labwareDefURI for labware ${templateLabwareId}, cannot run duplicateLabware thunk`
  )
  const initialDeckSetup = stepFormSelectors.getInitialDeckSetup(state)
  const templateLabwareIdIsOffDeck =
    initialDeckSetup.labware[templateLabwareId].slot === 'offDeck'
  const labwareDef = labwareDefSelectors.getLabwareDefsByURI(state)[
    templateLabwareDefURI
  ]
  const duplicateSlot = getNextAvailableDeckSlot(
    initialDeckSetup,
    robotType,
    labwareDef
  )
  if (duplicateSlot == null && !templateLabwareIdIsOffDeck) {
    console.error('no slots available, cannot duplicate labware')
  }
  const allNicknamesById = uiLabwareSelectors.getLabwareNicknamesById(state)
  const templateNickname = allNicknamesById[templateLabwareId]
  const duplicateLabwareNickname = getNextNickname(
    Object.keys(allNicknamesById).map((id: string) => allNicknamesById[id]), // NOTE: flow won't do Object.values here >:(
    templateNickname
  )
  const duplicateLabwareId = uuid() + ':' + templateLabwareDefURI

  if (templateLabwareDefURI) {
    if (templateLabwareIdIsOffDeck) {
      dispatch({
        type: 'DUPLICATE_LABWARE',
        payload: {
          duplicateLabwareNickname,
          templateLabwareId,
          duplicateLabwareId,
          slot: 'offDeck',
        },
      })
    }
  }
  if (duplicateSlot != null && !templateLabwareIdIsOffDeck) {
    dispatch({
      type: 'DUPLICATE_LABWARE',
      payload: {
        duplicateLabwareNickname,
        templateLabwareId,
        duplicateLabwareId,
        slot: duplicateSlot,
      },
    })
  }
}

interface EditSlotInfo {
  createdModuleForSlot?: ModuleOnDeck | null
  createdLabwareForSlot?: LabwareOnDeck | null
  createdNestedLabwareForSlot?: LabwareOnDeck | null
  preSelectedFixture?: Fixture | null
}

export const editSlotInfo: (
  args: EditSlotInfo
) => ThunkAction<
  | SelectNestedLabwareAction
  | SelectLabwareAction
  | SelectModuleAction
  | SelectFixtureAction
> = args => dispatch => {
  const {
    createdModuleForSlot,
    createdLabwareForSlot,
    createdNestedLabwareForSlot,
    preSelectedFixture,
  } = args

  dispatch(
    selectNestedLabware({
      nestedLabwareDefUri: createdNestedLabwareForSlot?.labwareDefURI ?? null,
    })
  )
  dispatch(
    selectLabware({
      labwareDefUri: createdLabwareForSlot?.labwareDefURI ?? null,
    })
  )
  dispatch(selectModule({ moduleModel: createdModuleForSlot?.model ?? null }))
  dispatch(selectFixture({ fixture: preSelectedFixture ?? null }))
}
