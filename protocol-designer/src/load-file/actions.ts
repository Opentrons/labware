import { migration } from './migration'
import { selectors as fileDataSelectors } from '../file-data'
import { saveFile } from './utils'

import type { SyntheticEvent } from 'react'
import type { PDProtocolFile } from '../file-types'
import type { GetState, ThunkAction, ThunkDispatch } from '../types'
import type {
  FileUploadErrorType,
  FileUploadMessage,
  LoadFileAction,
  NewProtocolFields,
} from './types'
export interface FileUploadMessageAction {
  type: 'FILE_UPLOAD_MESSAGE'
  payload: FileUploadMessage
}
export const fileUploadMessage = (
  payload: FileUploadMessage
): FileUploadMessageAction => ({
  type: 'FILE_UPLOAD_MESSAGE',
  payload,
})
export interface DismissFileUploadMessageAction {
  type: 'DISMISS_FILE_UPLOAD_MESSAGE'
}
export const dismissFileUploadMessage = (): DismissFileUploadMessageAction => ({
  type: 'DISMISS_FILE_UPLOAD_MESSAGE',
})
// expects valid, parsed JSON protocol.
export const loadFileAction = (payload: PDProtocolFile): LoadFileAction => ({
  type: 'LOAD_FILE',
  payload: migration(payload),
})
// load file thunk, handles file loading errors
export const loadProtocolFile = (
  event: SyntheticEvent<HTMLInputElement>
): ThunkAction<any> => (dispatch: ThunkDispatch<any>, getState: GetState) => {
  const fileError = (
    errorType: FileUploadErrorType,
    errorMessage?: string
  ): void =>
    dispatch(
      fileUploadMessage({
        isError: true,
        errorType,
        errorMessage,
      })
    )

  // @ts-expect-error need null checking
  const file = event.currentTarget.files[0]
  const reader = new FileReader()
  // reset the state of the input to allow file re-uploads
  event.currentTarget.value = ''

  if (!file.name.endsWith('.json')) {
    fileError('INVALID_FILE_TYPE')
  } else {
    reader.onload = readEvent => {
      const result = ((readEvent.currentTarget as any) as FileReader).result
      let parsedProtocol: PDProtocolFile | null | undefined

      try {
        parsedProtocol = JSON.parse((result as any) as string)
        // TODO LATER Ian 2018-05-18 validate file with JSON Schema here
        parsedProtocol && dispatch(loadFileAction(parsedProtocol))
      } catch (error) {
        console.error(error)
        if (error instanceof Error) {
          fileError('INVALID_JSON_FILE', error.message)
        }
      }
    }

    reader.readAsText(file)
  }
}
export interface UndoLoadFile {
  type: 'UNDO_LOAD_FILE'
}
// TODO: Ian 2019-06-25 consider making file loading non-committal
// so UNDO_LOAD_FILE doesnt' just reset Redux state
export const undoLoadFile = (): UndoLoadFile => ({
  type: 'UNDO_LOAD_FILE',
})
export interface CreateNewProtocolAction {
  type: 'CREATE_NEW_PROTOCOL'
  payload: NewProtocolFields
}
export const createNewProtocol = (
  payload: CreateNewProtocolAction['payload']
): CreateNewProtocolAction => ({
  type: 'CREATE_NEW_PROTOCOL',
  payload,
})
export interface SaveProtocolFileAction {
  type: 'SAVE_PROTOCOL_FILE'
}
export const saveProtocolFile: () => ThunkAction<SaveProtocolFileAction> = () => (
  dispatch,
  getState
) => {
  // dispatching this should update the state, eg lastModified timestamp
  dispatch({
    type: 'SAVE_PROTOCOL_FILE',
  })
  const state = getState()
  const fileData = fileDataSelectors.createFile(state)
  const protocolName =
    fileDataSelectors.getFileMetadata(state).protocolName || 'untitled'
  const fileName = `${protocolName}.json`
  saveFile(fileData, fileName)
}
