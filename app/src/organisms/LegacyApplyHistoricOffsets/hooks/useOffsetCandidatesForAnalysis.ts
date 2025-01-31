import isEqual from 'lodash/isEqual'
import {
  getLabwareDisplayName,
  IDENTITY_VECTOR,
  getLoadedLabwareDefinitionsByUri,
} from '@opentrons/shared-data'
import { useAllHistoricOffsets } from './useAllHistoricOffsets'
import { getLabwareLocationCombos } from './getLabwareLocationCombos'

import type {
  ProtocolAnalysisOutput,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'
import type { LabwareOffset } from '@opentrons/api-client'
export interface OffsetCandidate extends LabwareOffset {
  runCreatedAt: string
  labwareDisplayName: string
}
export function useOffsetCandidatesForAnalysis(
  analysisOutput: ProtocolAnalysisOutput | CompletedProtocolAnalysis | null,
  robotIp?: string | null
): OffsetCandidate[] {
  const allHistoricOffsets = useAllHistoricOffsets(
    robotIp != null ? { hostname: robotIp } : null
  )
  if (allHistoricOffsets.length === 0 || analysisOutput == null) return []
  const { commands, labware, modules = [] } = analysisOutput
  const labwareLocationCombos = getLabwareLocationCombos(
    commands,
    labware,
    modules
  )
  const defsByUri = getLoadedLabwareDefinitionsByUri(commands)

  return labwareLocationCombos.reduce<OffsetCandidate[]>(
    (acc, { location, definitionUri }) => {
      const offsetMatch = allHistoricOffsets.find(
        historicOffset =>
          !isEqual(historicOffset.vector, IDENTITY_VECTOR) &&
          isEqual(historicOffset.location, location) &&
          historicOffset.definitionUri === definitionUri
      )
      const labwareDisplayName =
        definitionUri in defsByUri
          ? getLabwareDisplayName(defsByUri[definitionUri])
          : definitionUri

      return offsetMatch == null
        ? acc
        : [...acc, { ...offsetMatch, labwareDisplayName }]
    },
    []
  )
}
