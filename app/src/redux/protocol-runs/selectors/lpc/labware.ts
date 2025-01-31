import { createSelector } from 'reselect'
import isEqual from 'lodash/isEqual'

import {
  getIsTiprack,
  getLabwareDisplayName,
  getLabwareDefURI,
  getVectorSum,
  getVectorDifference,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import { getCurrentOffsetForLabwareInLocation } from '/app/transformations/analysis'
import { getItemLabwareDef } from './transforms'

import type { Selector } from 'reselect'
import type {
  VectorOffset,
  LegacyLabwareOffsetLocation,
} from '@opentrons/api-client'
import type { LabwareDefinition2, Coordinates } from '@opentrons/shared-data'
import type { State } from '../../../types'

// TODO(jh, 01-16-25): Revisit once LPC `step` refactors are completed.
// eslint-disable-next-line opentrons/no-imports-across-applications
import type { LabwarePositionCheckStep } from '/app/organisms/LabwarePositionCheck/types'

// TODO(jh, 01-13-25): Remove the explicit type casting after restructuring "step".
// TODO(jh, 01-17-25): As LPC selectors become finalized, wrap them in createSelector.

export const selectActiveLwInitialPosition = (
  step: LabwarePositionCheckStep | null,
  runId: string,
  state: State
): VectorOffset | null => {
  const { workingOffsets } = state.protocolRuns[runId]?.lpc ?? {}

  if (step != null && workingOffsets != null) {
    const labwareId = 'labwareId' in step ? step.labwareId : ''
    const location = 'location' in step ? step.location : ''

    return (
      workingOffsets.find(
        o =>
          o.labwareId === labwareId &&
          isEqual(o.location, location) &&
          o.initialPosition != null
      )?.initialPosition ?? null
    )
  } else {
    if (workingOffsets == null) {
      console.warn('LPC state not initalized before selector use.')
    }

    return null
  }
}

export const selectActiveLwExistingOffset = (
  runId: string,
  state: State
): VectorOffset => {
  const { existingOffsets, steps } = state.protocolRuns[runId]?.lpc ?? {}

  if (existingOffsets == null || steps == null) {
    console.warn('LPC state not initalized before selector use.')
    return IDENTITY_VECTOR
  } else if (
    !('labwareId' in steps.current) ||
    !('location' in steps.current) ||
    !('slotName' in steps.current.location)
  ) {
    console.warn(
      `No labwareId or location in current step: ${steps.current.section}`
    )
    return IDENTITY_VECTOR
  } else {
    const lwUri = getLabwareDefURI(
      getItemLabwareDefFrom(runId, state) as LabwareDefinition2
    )

    return (
      getCurrentOffsetForLabwareInLocation(
        existingOffsets,
        lwUri,
        steps.current.location
      )?.vector ?? IDENTITY_VECTOR
    )
  }
}

export interface SelectOffsetsToApplyResult {
  definitionUri: string
  location: LegacyLabwareOffsetLocation
  vector: Coordinates
}

export const selectOffsetsToApply = (
  runId: string
): Selector<State, SelectOffsetsToApplyResult[]> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.workingOffsets,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData,
    (state: State) => state.protocolRuns[runId]?.lpc?.existingOffsets,
    (workingOffsets, protocolData, existingOffsets) => {
      if (
        workingOffsets == null ||
        protocolData == null ||
        existingOffsets == null
      ) {
        console.warn('LPC state not initalized before selector use.')
        return []
      }

      return workingOffsets.map(
        ({ initialPosition, finalPosition, labwareId, location }) => {
          const definitionUri =
            protocolData.labware.find(l => l.id === labwareId)?.definitionUri ??
            null

          if (
            finalPosition == null ||
            initialPosition == null ||
            definitionUri == null
          ) {
            throw new Error(
              `cannot create offset for labware with id ${labwareId}, in location ${JSON.stringify(
                location
              )}, with initial position ${String(
                initialPosition
              )}, and final position ${String(finalPosition)}`
            )
          } else {
            const existingOffset =
              getCurrentOffsetForLabwareInLocation(
                existingOffsets,
                definitionUri,
                location
              )?.vector ?? IDENTITY_VECTOR
            const vector = getVectorSum(
              existingOffset,
              getVectorDifference(finalPosition, initialPosition)
            )
            return { definitionUri, location, vector }
          }
        }
      )
    }
  )

export const selectIsActiveLwTipRack = (
  runId: string,
  state: State
): boolean => {
  const { current } = state.protocolRuns[runId]?.lpc?.steps ?? {}

  if (current != null && 'labwareId' in current) {
    return getIsTiprack(
      getItemLabwareDefFrom(runId, state) as LabwareDefinition2
    )
  } else {
    console.warn(
      'No labwareId in step or LPC state not initalized before selector use.'
    )
    return false
  }
}

export const selectLwDisplayName = (runId: string, state: State): string => {
  const { current } = state.protocolRuns[runId]?.lpc?.steps ?? {}

  if (current != null && 'labwareId' in current) {
    return getLabwareDisplayName(
      getItemLabwareDefFrom(runId, state) as LabwareDefinition2
    )
  } else {
    console.warn(
      'No labwareId in step or LPC state not initalized before selector use.'
    )
    return ''
  }
}

export const selectActiveAdapterDisplayName = (
  runId: string,
  state: State
): string => {
  const { protocolData, labwareDefs, steps } =
    state.protocolRuns[runId]?.lpc ?? {}

  if (protocolData == null || labwareDefs == null || steps == null) {
    console.warn('LPC state not initialized before selector use.')
    return ''
  }

  return 'adapterId' in steps.current && steps.current.adapterId != null
    ? getItemLabwareDef({
        labwareId: steps.current.adapterId,
        loadedLabware: protocolData.labware,
        labwareDefs,
      })?.metadata.displayName ?? ''
    : ''
}

export const selectItemLabwareDef = (
  runId: string
): Selector<State, LabwareDefinition2 | null> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.steps.current,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareDefs,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData.labware,
    (current, labwareDefs, loadedLabware) => {
      const labwareId =
        current != null && 'labwareId' in current ? current.labwareId : ''

      if (labwareId === '' || labwareDefs == null || loadedLabware == null) {
        console.warn(
          `No labwareId associated with step: ${current?.section} or LPC state not initialized before selector use.`
        )
        return null
      }

      return getItemLabwareDef({
        labwareId,
        labwareDefs,
        loadedLabware,
      })
    }
  )

const getItemLabwareDefFrom = (
  runId: string,
  state: State
): LabwareDefinition2 | null => {
  const current = state.protocolRuns[runId]?.lpc?.steps.current
  const labwareDefs = state.protocolRuns[runId]?.lpc?.labwareDefs
  const loadedLabware = state.protocolRuns[runId]?.lpc?.protocolData.labware

  const labwareId =
    current != null && 'labwareId' in current ? current.labwareId : ''

  if (labwareId === '' || labwareDefs == null || loadedLabware == null) {
    console.warn(
      `No labwareId associated with step: ${current?.section} or LPC state not initialized before selector use.`
    )
    return null
  }

  return getItemLabwareDef({
    labwareId,
    labwareDefs,
    loadedLabware,
  })
}
