import { createSelector } from 'reselect'

import { getPipetteNameSpecs } from '@opentrons/shared-data'

import type { Selector } from 'reselect'
import type { LoadedPipette, PipetteChannels } from '@opentrons/shared-data'
import type { State } from '../../../types'

export const selectActivePipette = (
  runId: string
): Selector<State, LoadedPipette | null> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.activePipetteId,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData,
    (activePipetteId, protocolData) => {
      if (activePipetteId == null || protocolData == null) {
        console.warn('LPC state not initalized before selector use.')
        return null
      } else {
        return (
          protocolData?.pipettes.find(
            pipette => pipette.id === activePipetteId
          ) ?? null
        )
      }
    }
  )

export const selectActivePipetteChannelCount = (
  runId: string
): Selector<State, PipetteChannels> =>
  createSelector(
    (state: State) => selectActivePipette(runId)(state)?.pipetteName,
    pipetteName =>
      pipetteName != null ? getPipetteNameSpecs(pipetteName)?.channels ?? 1 : 1
  )
