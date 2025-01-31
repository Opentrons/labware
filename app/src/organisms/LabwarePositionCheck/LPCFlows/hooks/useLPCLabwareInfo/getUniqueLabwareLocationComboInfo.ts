import { isEqual } from 'lodash'

import { getLabwareDefURI } from '@opentrons/shared-data'

import { getLabwareLocationCombos } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLabwareLocationCombos'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLabwareLocationCombos'

export interface GetUniqueLocationComboInfoParams {
  protocolData: CompletedProtocolAnalysis | null
  labwareDefs: LabwareDefinition2[] | null
}

export function getUniqueLabwareLocationComboInfo({
  labwareDefs,
  protocolData,
}: GetUniqueLocationComboInfoParams): LabwareLocationCombo[] {
  if (protocolData == null || labwareDefs == null) {
    return []
  }

  const { commands, labware, modules = [] } = protocolData
  const labwareLocationCombos = getLabwareLocationCombos(
    commands,
    labware,
    modules
  )

  // Filter out duplicate labware and labware that is not LPC-able.
  return labwareLocationCombos.reduce<LabwareLocationCombo[]>(
    (acc, labwareLocationCombo) => {
      const labwareDef = labwareDefs.find(
        def => getLabwareDefURI(def) === labwareLocationCombo.definitionUri
      )
      if (
        (labwareDef?.allowedRoles ?? []).includes('adapter') ||
        (labwareDef?.allowedRoles ?? []).includes('lid')
      ) {
        return acc
      }
      // remove duplicate definitionUri in same location
      const comboAlreadyExists = acc.some(
        accLocationCombo =>
          labwareLocationCombo.definitionUri ===
            accLocationCombo.definitionUri &&
          isEqual(labwareLocationCombo.location, accLocationCombo.location)
      )
      return comboAlreadyExists ? acc : [...acc, labwareLocationCombo]
    },
    []
  )
}
