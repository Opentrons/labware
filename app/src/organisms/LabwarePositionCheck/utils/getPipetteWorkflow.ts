import uniq from 'lodash/uniq'
import { doesPipetteVisitAllTipracks } from './doesPipetteVisitAllTipracks'
import type { JsonProtocolFile, PipetteName } from '@opentrons/shared-data'
import type { Command } from '@opentrons/shared-data/protocol/types/schemaV5'

// determines pre run check workflow 1 or 2
export const getPipetteWorkflow = (args: {
  pipetteNames: PipetteName[]
  primaryPipetteId: string
  labware: JsonProtocolFile['']
  commands: Command[]
}): 1 | 2 => {
  const { pipetteNames, primaryPipetteId, labware, commands } = args
  const uniquePipetteNames = uniq(pipetteNames)
  if (uniquePipetteNames.length === 1) {
    return 1
  }

  if (doesPipetteVisitAllTipracks(primaryPipetteId, labware, commands)) {
    return 1
  }

  return 2
}
