import reduce from 'lodash/reduce'
import {
  getIsTiprack,
  JsonProtocolFile,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { Command } from '@opentrons/shared-data/protocol/types/schemaV5'
import type { PipetteAccessParams } from '@opentrons/shared-data/protocol/types/schemaV3'

interface PickUpTipCommand {
  command: 'pickUpTip'
  params: PipetteAccessParams
}

export const doesPipetteVisitAllTipracks = (
  pipetteId: string,
  labware: JsonProtocolFile['labware'],
  labwareDefinitions: Record<string, LabwareDefinition2>,
  commands: Command[]
): boolean => {
  const numberOfTipracks = reduce(
    labware,
    (numberOfTipracks, currentLabware) => {
      // @ts-expect-error v1 protocols do not definitionIds baked into the labware
      const labwareDef = labwareDefinitions[currentLabware.definitionId]
      return getIsTiprack(labwareDef) ? numberOfTipracks + 1 : numberOfTipracks
    },
    0
  )

  const pickUpTipCommandsWithPipette: PickUpTipCommand[] = commands
    .filter(
      (command): command is PickUpTipCommand => command.command === 'pickUpTip'
    )
    .filter(command => command.params.pipette === pipetteId)

  const tipracksVisited = pickUpTipCommandsWithPipette.reduce<string[]>(
    (visited, command) => {
      const tiprack = command.params.labware
      return visited.includes(tiprack) ? visited : [...visited, tiprack]
    },
    []
  )

  return numberOfTipracks === tipracksVisited.length
}
