import { useMemo } from 'react'

import { getUniqueLabwareLocationComboInfo } from './getUniqueLabwareLocationComboInfo'
import { getLPCLabwareInfoFrom } from './getLPCLabwareInfoFrom'

import type { LabwareOffset } from '@opentrons/api-client'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'
import type { GetUniqueLocationComboInfoParams } from './getUniqueLabwareLocationComboInfo'

export type UseLPCLabwareInfoProps = GetUniqueLocationComboInfoParams & {
  currentOffsets: LabwareOffset[]
}

// TODO(jh, 01-22-25): This interface will change substantially the switch to /labwareOffsets.

// Structures LPC-able labware info for injection into LPC flows.
export function useLPCLabwareInfo({
  currentOffsets,
  labwareDefs,
  protocolData,
}: UseLPCLabwareInfoProps): LPCLabwareInfo {
  // Analysis-derived data is the source of truth, because we must account for labware that has offsets AND account for labware
  // that does not have offsets. This will change with the LPC HTTP API refactors.
  const lwURIs = getLabwareURIsFromAnalysis(protocolData)
  const lwLocationCombos = useMemo(
    () =>
      getUniqueLabwareLocationComboInfo({
        labwareDefs,
        protocolData,
      }),
    [labwareDefs != null, protocolData != null]
  )

  return useMemo(
    () =>
      getLPCLabwareInfoFrom({
        lwURIs,
        currentOffsets,
        lwLocationCombos,
        labwareDefs,
      }),
    [lwURIs.length, currentOffsets.length, lwLocationCombos.length]
  )
}

function getLabwareURIsFromAnalysis(
  analysis: UseLPCLabwareInfoProps['protocolData']
): string[] {
  return analysis?.labware.map(lwInfo => lwInfo.definitionUri) ?? []
}
