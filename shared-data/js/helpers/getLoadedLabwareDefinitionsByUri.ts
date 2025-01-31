import { getLabwareDefURI } from '.'
import type { RunTimeCommand, LabwareDefinition2 } from '..'

export interface LabwareDefinitionsByUri {
  [defURI: string]: LabwareDefinition2
}

export function getLoadedLabwareDefinitionsByUri(
  commands: RunTimeCommand[]
): LabwareDefinitionsByUri {
  return commands.reduce((acc, command) => {
    if (
      command.commandType === 'loadLabware' ||
      command.commandType === 'loadLid' ||
      command.commandType === 'loadLidStack'
    ) {
      const labwareDef: LabwareDefinition2 | undefined =
        command.result?.definition
      if (labwareDef == null) {
        console.warn(
          `could not find a labware definition in the results of load labware command: ${JSON.stringify(
            command
          )}`
        )
        return acc
      } else {
        const definitionUri = getLabwareDefURI(labwareDef)
        return { ...acc, [definitionUri]: labwareDef }
      }
    } else {
      return acc
    }
  }, {})
}
