import { createSelector } from 'reselect'

import {
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import {
  getSelectedLabwareOffsetDetails,
  getOffsetDetailsForAllLabware,
} from '../transforms'

import type { Selector } from 'reselect'
import type { VectorOffset, LabwareOffset } from '@opentrons/api-client'
import type { State } from '/app/redux/types'
import type {
  LabwareDetails,
  OffsetDetails,
  SelectOffsetsToApplyResult,
} from '/app/redux/protocol-runs'

export const selectSelectedOffsetDetails = (
  runId: string
): Selector<State, OffsetDetails[]> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware?.uri,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (uri, lw) => {
      if (uri == null || lw == null) {
        console.warn('Failed to access labware details.')
        return []
      } else {
        return lw[uri].offsetDetails ?? []
      }
    }
  )

export const selectSelectedLwExistingOffset = (
  runId: string
): Selector<State, VectorOffset> =>
  createSelector(
    (state: State) => getSelectedLabwareOffsetDetails(runId, state),
    details => {
      const existingVector = details?.existingOffset?.vector

      if (existingVector == null) {
        console.warn('No existing offset vector found for active labware')
        return IDENTITY_VECTOR
      } else {
        return existingVector ?? IDENTITY_VECTOR
      }
    }
  )

export const selectOffsetsToApply = (
  runId: string
): Selector<State, SelectOffsetsToApplyResult[]> =>
  createSelector(
    (state: State) => getOffsetDetailsForAllLabware(runId, state),
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData,
    (allDetails, protocolData): SelectOffsetsToApplyResult[] => {
      if (protocolData == null) {
        console.warn('LPC state not initalized before selector use.')
        return []
      }

      return allDetails.flatMap(
        ({ workingOffset, existingOffset, locationDetails }) => {
          const definitionUri = locationDetails.definitionUri
          const { initialPosition, finalPosition } = workingOffset ?? {}

          if (
            finalPosition == null ||
            initialPosition == null ||
            definitionUri == null ||
            existingOffset == null ||
            // The slotName is null when applying a default offset. This condition
            // is effectively a stub to maintain compatability with the legacy HTTP API,
            // and will be refactored soon.
            locationDetails.slotName == null
          ) {
            console.error(
              `Cannot generate offsets for labware with incomplete details. ID: ${locationDetails.labwareId}`
            )
            return []
          }

          const existingOffsetVector = existingOffset.vector
          const finalVector = getVectorSum(
            existingOffsetVector,
            getVectorDifference(finalPosition, initialPosition)
          )
          return [
            {
              definitionUri,
              location: { ...locationDetails },
              vector: finalVector,
            },
          ]
        }
      )
    }
  )

// TODO(jh, 01-29-25): Revisit this once "View Offsets" is refactored out of LPC.
export const selectLabwareOffsetsForAllLw = (
  runId: string
): Selector<State, LabwareOffset[]> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (labware): LabwareOffset[] => {
      if (labware == null) {
        console.warn('Labware info not initialized in state')
        return []
      }

      return Object.values(labware).flatMap((details: LabwareDetails) =>
        details.offsetDetails.map(offsetDetail => ({
          id: details.id,
          createdAt: offsetDetail?.existingOffset?.createdAt ?? '',
          definitionUri: offsetDetail.locationDetails.definitionUri,
          location: {
            slotName:
              offsetDetail.locationDetails.slotName ?? 'DEFAULT_OFFSET_STUB',
            moduleModel: offsetDetail.locationDetails.moduleModel,
            definitionUri: offsetDetail.locationDetails.definitionUri,
          },
          vector: offsetDetail?.existingOffset?.vector ?? IDENTITY_VECTOR,
        }))
      )
    }
  )
