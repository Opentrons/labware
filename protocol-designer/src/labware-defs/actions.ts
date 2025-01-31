import Ajv from 'ajv'
import isEqual from 'lodash/isEqual'
import flatten from 'lodash/flatten'
import values from 'lodash/values'
import uniqBy from 'lodash/uniqBy'
import {
  getLabwareDefURI,
  getIsTiprack,
  OPENTRONS_LABWARE_NAMESPACE,
  labwareSchemaV2,
} from '@opentrons/shared-data'
import { getAllWellSetsForLabware } from '../utils'
import * as labwareDefSelectors from './selectors'

import type { SyntheticEvent } from 'react'
import type { ThunkAction } from '../types'
import type { LabwareUploadMessage } from './types'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface LabwareUploadMessageAction {
  type: 'LABWARE_UPLOAD_MESSAGE'
  payload: LabwareUploadMessage
}
export const labwareUploadMessage = (
  payload: LabwareUploadMessage
): LabwareUploadMessageAction => ({
  type: 'LABWARE_UPLOAD_MESSAGE',
  payload,
})
export interface CreateCustomLabwareDef {
  type: 'CREATE_CUSTOM_LABWARE_DEF'
  payload: {
    def: LabwareDefinition2
  }
}
export const createCustomLabwareDefAction = (
  payload: CreateCustomLabwareDef['payload']
): CreateCustomLabwareDef => ({
  type: 'CREATE_CUSTOM_LABWARE_DEF',
  payload,
})
export interface ReplaceCustomLabwareDef {
  type: 'REPLACE_CUSTOM_LABWARE_DEF'
  payload: {
    defURIToOverwrite: string
    newDef: LabwareDefinition2
    isOverwriteMismatched: boolean
  }
}
export const replaceCustomLabwareDef = (
  payload: ReplaceCustomLabwareDef['payload']
): ReplaceCustomLabwareDef => ({
  type: 'REPLACE_CUSTOM_LABWARE_DEF',
  payload,
})
const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true,
})
const validate = ajv.compile(labwareSchemaV2)
const _labwareDefsMatchingLoadName = (
  labwareDefs: LabwareDefinition2[],
  loadName: string
): LabwareDefinition2[] =>
  labwareDefs.filter(def => def.parameters.loadName === loadName)

const _labwareDefsMatchingDisplayName = (
  labwareDefs: LabwareDefinition2[],
  displayName: string
): LabwareDefinition2[] =>
  labwareDefs.filter(
    def =>
      def.metadata.displayName.trim().toLowerCase() ===
      displayName.trim().toLowerCase()
  )

const getIsOverwriteMismatched = (
  newDef: LabwareDefinition2,
  overwrittenDef: LabwareDefinition2
): boolean => {
  const matchedWellOrdering = isEqual(newDef.ordering, overwrittenDef.ordering)
  const matchedMultiUse =
    matchedWellOrdering &&
    isEqual(
      getAllWellSetsForLabware(newDef),
      getAllWellSetsForLabware(overwrittenDef)
    )
  return !(matchedWellOrdering && matchedMultiUse)
}

const _createCustomLabwareDef: (
  onlyTiprack: boolean
) => (
  event: SyntheticEvent<HTMLInputElement>
) => ThunkAction<any> = onlyTiprack => event => (dispatch, getState) => {
  const customLabwareDefs = values(
    labwareDefSelectors.getCustomLabwareDefsByURI(getState())
  )
  const allLabwareDefs = values(
    labwareDefSelectors.getLabwareDefsByURI(getState())
  )
  // @ts-expect-error(sa, 2021-6-20): null check
  const file = event.currentTarget.files[0]
  const reader = new FileReader()
  // reset the state of the input to allow file re-uploads
  event.currentTarget.value = ''

  if (!file.name.match(/\.json$/i)) {
    return dispatch(
      labwareUploadMessage({
        messageType: 'NOT_JSON',
      })
    )
  }

  reader.onload = readEvent => {
    const result = ((readEvent.currentTarget as any) as FileReader).result
    let parsedLabwareDef: LabwareDefinition2 | null | undefined

    try {
      parsedLabwareDef = JSON.parse((result as any) as string)
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        return dispatch(
          labwareUploadMessage({
            messageType: 'INVALID_JSON_FILE',
            errorText: error.message,
          })
        )
      }
    }

    const valid: boolean | PromiseLike<any> =
      parsedLabwareDef === null ? false : validate(parsedLabwareDef)
    const hasWellA1 = flatten(parsedLabwareDef?.ordering || []).includes('A1')
    const loadName = parsedLabwareDef?.parameters?.loadName || ''
    const displayName = parsedLabwareDef?.metadata?.displayName || ''

    if (!hasWellA1) {
      console.warn('uploaded labware conforms to schema, but has no well A1!')
    }

    if (!valid || !hasWellA1) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'INVALID_JSON_FILE',
        })
      )
      // @ts-expect-error(sa, 2021-6-20): parsedLabwareDef might be nullsy
    } else if (onlyTiprack && !getIsTiprack(parsedLabwareDef)) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'ONLY_TIPRACK',
        })
      )
    } else if (parsedLabwareDef?.namespace === OPENTRONS_LABWARE_NAMESPACE) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'USES_STANDARD_NAMESPACE',
        })
      )
    } else if (allLabwareDefs.some(def => isEqual(def, parsedLabwareDef))) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'EXACT_LABWARE_MATCH',
        })
      )
    }

    const defsMatchingCustomLoadName = _labwareDefsMatchingLoadName(
      customLabwareDefs,
      loadName
    )

    const defsMatchingCustomDisplayName = _labwareDefsMatchingDisplayName(
      customLabwareDefs,
      displayName
    )

    if (
      defsMatchingCustomLoadName.length > 0 ||
      defsMatchingCustomDisplayName.length > 0
    ) {
      const matchingDefs = [
        ...defsMatchingCustomLoadName,
        ...defsMatchingCustomDisplayName,
      ]
      console.assert(
        uniqBy(matchingDefs, getLabwareDefURI).length === 1,
        'expected exactly 1 matching labware def to ask to overwrite'
      )
      return dispatch(
        labwareUploadMessage({
          messageType: 'ASK_FOR_LABWARE_OVERWRITE',
          defsMatchingLoadName: defsMatchingCustomLoadName,
          defsMatchingDisplayName: defsMatchingCustomDisplayName,
          // @ts-expect-error(sa, 2021-6-20): parsedLabwareDef might be nullsy
          newDef: parsedLabwareDef,
          defURIToOverwrite: getLabwareDefURI(matchingDefs[0]),
          isOverwriteMismatched: getIsOverwriteMismatched(
            // @ts-expect-error(sa, 2021-6-20): parsedLabwareDef might be nullsy
            parsedLabwareDef,
            matchingDefs[0]
          ),
        })
      )
    }

    const allDefsMatchingLoadName = _labwareDefsMatchingLoadName(
      allLabwareDefs,
      loadName
    )

    const allDefsMatchingDisplayName = _labwareDefsMatchingDisplayName(
      allLabwareDefs,
      displayName
    )

    if (
      allDefsMatchingLoadName.length > 0 ||
      allDefsMatchingDisplayName.length > 0
    ) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'LABWARE_NAME_CONFLICT',
          defsMatchingLoadName: allDefsMatchingLoadName,
          defsMatchingDisplayName: allDefsMatchingDisplayName,
          // @ts-expect-error(sa, 2021-6-20): parsedLabwareDef might be nullsy
          newDef: parsedLabwareDef,
        })
      )
    }

    return dispatch(
      createCustomLabwareDefAction({
        // @ts-expect-error(sa, 2021-6-20): parsedLabwareDef might be nullsy
        def: parsedLabwareDef,
      })
    )
  }

  reader.readAsText(file)
}

export const createCustomLabwareDef: (
  event: SyntheticEvent<HTMLInputElement>
) => ThunkAction<any> = _createCustomLabwareDef(false)

export const createCustomTiprackDef: (
  event: SyntheticEvent<HTMLInputElement>
) => ThunkAction<any> = _createCustomLabwareDef(true)

interface DismissLabwareUploadMessage {
  type: 'DISMISS_LABWARE_UPLOAD_MESSAGE'
}
export const dismissLabwareUploadMessage = (): DismissLabwareUploadMessage => ({
  type: 'DISMISS_LABWARE_UPLOAD_MESSAGE',
})
