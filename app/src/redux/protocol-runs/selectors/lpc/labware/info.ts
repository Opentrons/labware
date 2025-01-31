import { createSelector } from 'reselect'

import { getIsTiprack, getLabwareDisplayName } from '@opentrons/shared-data'

import {
  getItemLabwareDef,
  getSelectedLabwareOffsetDetails,
  getSelectedLabwareDefFrom,
} from '../transforms'

import type { Selector } from 'reselect'
import type {
  LegacyLabwareOffsetLocation,
  VectorOffset,
} from '@opentrons/api-client'
import type { State } from '/app/redux/types'
import type { Coordinates, LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LPCFlowType,
  LPCLabwareInfo,
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

export interface SelectOffsetsToApplyResult {
  definitionUri: string
  location: LegacyLabwareOffsetLocation
  vector: Coordinates
}

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
        if (selectedLabware.offsetLocationDetails.kind === 'default') {
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
