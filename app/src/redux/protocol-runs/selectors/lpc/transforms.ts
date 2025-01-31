import isEqual from 'lodash/isEqual'

import { getLabwareDefURI } from '@opentrons/shared-data'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { State } from '/app/redux/types'
import type { LabwareDetails, OffsetDetails } from '/app/redux/protocol-runs'

interface GetLabwareDefsForLPCParams {
  labwareId: string
  loadedLabware: CompletedProtocolAnalysis['labware']
  labwareDefs: LabwareDefinition2[]
}

export const getItemLabwareDef = ({
  labwareId,
  loadedLabware,
  labwareDefs,
}: GetLabwareDefsForLPCParams): LabwareDefinition2 | null => {
  const labwareDefUri =
    loadedLabware.find(l => l.id === labwareId)?.definitionUri ?? null

  if (labwareDefUri == null) {
    console.warn(`Null labware def found for labwareId: ${labwareId}`)
  }

  return (
    labwareDefs.find(def => getLabwareDefURI(def) === labwareDefUri) ?? null
  )
}

export const getSelectedLabwareOffsetDetails = (
  runId: string,
  state: State
): OffsetDetails | null => {
  const selectedLabware =
    state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware
  const offsetDetails =
    state.protocolRuns[runId]?.lpc?.labwareInfo.labware[
      selectedLabware?.uri ?? ''
    ].offsetDetails

  return (
    offsetDetails?.find(offset =>
      isEqual(offset.locationDetails, selectedLabware?.offsetLocationDetails)
    ) ?? null
  )
}

export const getSelectedLabwareDefFrom = (
  runId: string,
  state: State
): LabwareDefinition2 | null => {
  const selectedLabware =
    state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware
  const labwareDefs = state?.protocolRuns[runId]?.lpc?.labwareDefs
  const analysis = state?.protocolRuns[runId]?.lpc?.protocolData

  if (selectedLabware == null || labwareDefs == null || analysis == null) {
    console.warn('No selected labware or store not properly initialized.')
    return null
  } else {
    return getItemLabwareDef({
      labwareId: selectedLabware.id,
      labwareDefs,
      loadedLabware: analysis.labware,
    })
  }
}

export const getOffsetDetailsForAllLabware = (
  runId: string,
  state: State
): OffsetDetails[] => {
  const labware = state?.protocolRuns[runId]?.lpc?.labwareInfo.labware ?? {}

  return Object(labware).values(
    (details: LabwareDetails) => details.offsetDetails
  )
}
