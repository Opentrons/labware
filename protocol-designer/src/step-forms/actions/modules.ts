import { uuid } from '../../utils'
import { ModuleModel, ModuleRealType } from '@opentrons/shared-data'
import { DeckSlot } from '../../types'
export interface CreateModuleAction {
  type: 'CREATE_MODULE'
  payload: {
    slot: DeckSlot
    type: ModuleRealType
    model: ModuleModel
    // model should match name of module definition,
    id: string
  }
}
export const createModule = (
  args: Omit<CreateModuleAction['payload'], 'id'>
): CreateModuleAction => ({
  type: 'CREATE_MODULE',
  payload: { ...args, id: `${uuid()}:${args.type}` },
})
export interface EditModuleAction {
  type: 'EDIT_MODULE'
  payload: {
    id: string
    model: ModuleModel
  }
}
export const editModule = (
  args: EditModuleAction['payload']
): EditModuleAction => ({
  type: 'EDIT_MODULE',
  payload: args,
})
export interface DeleteModuleAction {
  type: 'DELETE_MODULE'
  payload: {
    id: string
  }
}
export const deleteModule = (id: string): DeleteModuleAction => ({
  type: 'DELETE_MODULE',
  payload: {
    id,
  },
})
