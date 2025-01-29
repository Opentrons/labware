import { createSelector } from 'reselect'

import {
  getIsTiprack,
  getLabwareDisplayName,
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import {
  getItemLabwareDef,
  getSelectedLabwareOffsetDetails,
  getOffsetDetailsForAllLabware,
  getSelectedLabwareDefFrom,
} from './transforms'

import type { Selector } from 'reselect'
import type {
  LabwareOffsetLocation,
  VectorOffset,
  LabwareOffset,
} from '@opentrons/api-client'
import type { State } from '../../../types'
import type { Coordinates, LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LabwareDetails,
  LPCFlowType,
  LPCLabwareInfo,
  OffsetDetails,
  SelectedLabwareInfo,
} from '/app/redux/protocol-runs'

export const selectAllLabwareInfo = (
  runId: string
): Selector<State, LPCLabwareInfo['labware']> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => labware ?? {}
  )

export const selectSelectedLabwareInfo = (
  runId: string
): Selector<State, SelectedLabwareInfo | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    selectedLabware => selectedLabware ?? null
  )

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

export const selectSelectedLwInitialPosition = (
  runId: string
): Selector<State, VectorOffset | null> =>
  createSelector(
    (state: State) => getSelectedLabwareOffsetDetails(runId, state),
    details => {
      const workingOffset = details?.workingOffset

      if (workingOffset == null) {
        return null
      } else {
        return workingOffset.initialPosition
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

export interface SelectOffsetsToApplyResult {
  definitionUri: string
  location: LabwareOffsetLocation
  vector: Coordinates
}

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
            existingOffset == null
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

// TOME TODO: You can break your selectors down into files along  offsets, maybe booleans, etc.
export const selectSelectedLabwareFlowType = (
  runId: string
): Selector<State, LPCFlowType | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    selectedLabware => {
      if (selectedLabware?.offsetLocationDetails == null) {
        return null
      } else {
        if (selectedLabware.offsetLocationDetails.slotName == null) {
          return 'default'
        } else {
          return 'location-specific'
        }
      }
    }
  )

export const selectSelectedLabwareDisplayName = (
  runId: string
): Selector<State, string> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware?.uri,
    (lw, uri) => {
      if (lw == null || uri == null) {
        console.warn('Cannot access invalid labware')
        return ''
      } else {
        return lw[uri].displayName
      }
    }
  )

export const selectIsSelectedLwTipRack = (
  runId: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) => getSelectedLabwareDefFrom(runId, state),
    def => (def != null ? getIsTiprack(def) : false)
  )

export const selectSelectedLwDisplayName = (
  runId: string
): Selector<State, string> =>
  createSelector(
    (state: State) => getSelectedLabwareDefFrom(runId, state),
    def => (def != null ? getLabwareDisplayName(def) : '')
  )

export const selectActiveAdapterDisplayName = (
  runId: string
): Selector<State, string> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    (state: State) => state?.protocolRuns[runId]?.lpc?.labwareDefs,
    (state: State) => state?.protocolRuns[runId]?.lpc?.protocolData,
    (selectedLabware, labwareDefs, analysis) => {
      const adapterId = selectedLabware?.offsetLocationDetails?.adapterId

      if (selectedLabware == null || labwareDefs == null || analysis == null) {
        console.warn('No selected labware or store not properly initialized.')
        return ''
      }

      return adapterId != null
        ? getItemLabwareDef({
            labwareId: adapterId,
            loadedLabware: analysis.labware,
            labwareDefs,
          })?.metadata.displayName ?? ''
        : ''
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
            slotName: offsetDetail.locationDetails.slotName,
            moduleModel: offsetDetail.locationDetails.moduleModel,
            definitionUri: offsetDetail.locationDetails.definitionUri,
          },
          vector: offsetDetail?.existingOffset?.vector ?? IDENTITY_VECTOR,
        }))
      )
    }
  )
export const selectSelectedLabwareDef = (
  runId: string
): Selector<State, LabwareDefinition2 | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareDefs,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData.labware,
    (selectedLabware, labwareDefs, loadedLabware) => {
      if (
        selectedLabware == null ||
        labwareDefs == null ||
        loadedLabware == null
      ) {
        console.warn('No selected labware or store not properly initialized.')
        return null
      } else {
        return getItemLabwareDef({
          labwareId: selectedLabware.id,
          labwareDefs,
          loadedLabware,
        })
      }
    }
  )
