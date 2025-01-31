import partition from 'lodash/partition'
import { getLabwareDisplayName } from '@opentrons/shared-data'

import type {
  LabwareDefinition2,
  LabwareLocation,
  LoadModuleRunTimeCommand,
  ModuleLocation,
  ModuleModel,
  RunTimeCommand,
} from '@opentrons/shared-data'

export interface LabwareSetupItem {
  definition: LabwareDefinition2
  nickName: string | null
  initialLocation: LabwareLocation
  moduleModel: ModuleModel | null
  moduleLocation: ModuleLocation | null
  labwareId?: string
}

export interface GroupedLabwareSetupItems {
  onDeckItems: LabwareSetupItem[]
  offDeckItems: LabwareSetupItem[]
}

export function getLabwareSetupItemGroups(
  commands: RunTimeCommand[]
): GroupedLabwareSetupItems {
  const [offDeckItems, onDeckItems] = partition(
    commands.reduce<LabwareSetupItem[]>((acc, c) => {
      if (
        c.commandType === 'loadLabware' &&
        c.result?.definition?.metadata?.displayCategory !== 'trash'
      ) {
        const { location, displayName } = c.params
        const { definition } = c.result ?? {}
        if (definition == null) return acc
        let moduleModel = null
        let moduleLocation = null
        if (location !== 'offDeck' && 'moduleId' in location) {
          const loadModuleCommand = commands.find(
            (c): c is LoadModuleRunTimeCommand =>
              c.commandType === 'loadModule' &&
              c.result?.moduleId === location.moduleId
          )
          if (loadModuleCommand == null) {
            console.error(
              `could not find load module command for module with id ${String(
                location.moduleId
              )}`
            )
          } else {
            moduleModel = loadModuleCommand.params.model
            moduleLocation = loadModuleCommand.params.location
          }
        }
        // NOTE: params.displayName is the user-assigned nickName, different from labareDisplayName from def
        const nickName =
          displayName != null &&
          displayName !== getLabwareDisplayName(definition)
            ? displayName
            : null

        return [
          ...acc,
          {
            initialLocation: c.params.location,
            definition,
            moduleModel,
            moduleLocation,
            nickName,
            labwareId: c.result?.labwareId,
          },
        ]
      }
      return acc
    }, []),
    ({ initialLocation }) => initialLocation === 'offDeck'
  )
  return { onDeckItems, offDeckItems }
}
