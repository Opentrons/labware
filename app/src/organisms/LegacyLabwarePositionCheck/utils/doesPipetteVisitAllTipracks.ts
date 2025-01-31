import { getIsTiprack } from '@opentrons/shared-data'

import type {
  LoadedLabware,
  RunTimeCommand,
  LabwareDefinition2,
} from '@opentrons/shared-data'

import {
  getPickUpTipCommandsWithPipette,
  getTipracksVisited,
} from '/app/transformations/commands'

export const doesPipetteVisitAllTipracks = (
  pipetteId: string,
  labware: LoadedLabware[],
  labwareDefinitions: Record<string, LabwareDefinition2>,
  commands: RunTimeCommand[]
): boolean => {
  const numberOfTipracks = labware.reduce(
    (numberOfTipracks, currentLabware) => {
      const labwareDef = labwareDefinitions[currentLabware.definitionUri]
      return getIsTiprack(labwareDef) ? numberOfTipracks + 1 : numberOfTipracks
    },
    0
  )
  const pickUpTipCommandsWithPipette = getPickUpTipCommandsWithPipette(
    commands,
    pipetteId
  )

  const tipracksVisited = getTipracksVisited(pickUpTipCommandsWithPipette)

  pickUpTipCommandsWithPipette.reduce<string[]>((visited, command) => {
    const tiprack = command.params.labwareId
    return visited.includes(tiprack) ? visited : [...visited, tiprack]
  }, [])

  return numberOfTipracks === tipracksVisited.length
}
