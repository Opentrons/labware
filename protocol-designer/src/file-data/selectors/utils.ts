import mapValues from 'lodash/mapValues'
import map from 'lodash/map'
import reduce from 'lodash/reduce'
import { getLoadLiquidCommands } from '../../load-file/migration/utils/getLoadLiquidCommands'
import { COLUMN_4_SLOTS, uuid } from '@opentrons/step-generation'

import type {
  AddressableAreaName,
  CreateCommand,
  LabwareLocation,
  LoadLabwareCreateCommand,
  LoadModuleCreateCommand,
  LoadPipetteCreateCommand,
  PipetteName,
} from '@opentrons/shared-data'
import type {
  LabwareEntities,
  LabwareLiquidState,
  PipetteEntities,
  RobotState,
  ModuleEntities,
  TimelineFrame,
  LiquidEntities,
} from '@opentrons/step-generation'

interface Pipettes {
  [pipetteId: string]: { name: PipetteName }
}

export const getLoadCommands = (
  initialRobotState: TimelineFrame,
  pipetteEntities: PipetteEntities,
  moduleEntities: ModuleEntities,
  labwareEntities: LabwareEntities,
  labwareNicknamesById: Record<string, string>,
  liquidEntities: LiquidEntities,
  ingredLocations: LabwareLiquidState
): CreateCommand[] => {
  const pipettes: Pipettes = mapValues(
    initialRobotState.pipettes,
    (
      pipette: typeof initialRobotState.pipettes[keyof typeof initialRobotState.pipettes],
      pipetteId: string
    ) => ({
      name: pipetteEntities[pipetteId].name,
    })
  )

  const loadPipetteCommands = map(
    initialRobotState.pipettes,
    (
      pipette: typeof initialRobotState.pipettes[keyof typeof initialRobotState.pipettes],
      pipetteId: string
    ): LoadPipetteCreateCommand => {
      const loadPipetteCommand = {
        key: uuid(),
        commandType: 'loadPipette' as const,
        params: {
          pipetteName: pipettes[pipetteId].name,
          mount: pipette.mount,
          pipetteId: pipetteId,
        },
      }
      return loadPipetteCommand
    }
  )

  // initiate "adapter" commands first so we can map through them to get the
  //  labware that goes on top of it's location
  const loadAdapterCommands = reduce<
    RobotState['labware'],
    LoadLabwareCreateCommand[]
  >(
    initialRobotState.labware,
    (
      acc,
      labware: typeof initialRobotState.labware[keyof typeof initialRobotState.labware],
      labwareId: string
    ): LoadLabwareCreateCommand[] => {
      const { def } = labwareEntities[labwareId]
      const isAdapter = def.allowedRoles?.includes('adapter')
      if (!isAdapter) {
        return acc
      }
      const isOnTopOfModule = labware.slot in initialRobotState.modules
      const { namespace, parameters, version, metadata } = def
      const loadName = parameters.loadName
      const loadAdapterCommands = {
        key: uuid(),
        commandType: 'loadLabware' as const,
        params: {
          displayName: metadata.displayName,
          labwareId,
          loadName,
          namespace,
          version,
          location: isOnTopOfModule
            ? { moduleId: labware.slot }
            : { slotName: labware.slot },
        },
      }

      return [...acc, loadAdapterCommands]
    },
    []
  )

  const loadLabwareCommands = reduce<
    RobotState['labware'],
    LoadLabwareCreateCommand[]
  >(
    initialRobotState.labware,
    (
      acc,
      labware: typeof initialRobotState.labware[keyof typeof initialRobotState.labware],
      labwareId: string
    ): LoadLabwareCreateCommand[] => {
      const { def } = labwareEntities[labwareId]
      const isAdapter = def.allowedRoles?.includes('adapter')
      if (isAdapter || def.metadata.displayCategory === 'trash') return acc
      const isOnTopOfModule = labware.slot in initialRobotState.modules
      const isOnAdapter =
        loadAdapterCommands.find(
          command => command.params.labwareId === labware.slot
        ) != null
      const { namespace, parameters, version } = def
      const loadName = parameters.loadName

      const isAddressableAreaName = COLUMN_4_SLOTS.includes(labware.slot)

      let location: LabwareLocation = { slotName: labware.slot }
      if (isOnTopOfModule) {
        location = { moduleId: labware.slot }
      } else if (isOnAdapter) {
        location = { labwareId: labware.slot }
      } else if (isAddressableAreaName) {
        // TODO(bh, 2024-01-02): check slots against addressable areas via the deck definition
        location = {
          addressableAreaName: labware.slot as AddressableAreaName,
        }
      } else if (labware.slot === 'offDeck') {
        location = 'offDeck'
      }

      const loadLabwareCommands = {
        key: uuid(),
        commandType: 'loadLabware' as const,
        params: {
          displayName:
            labwareNicknamesById[labwareId] ?? def.metadata.displayName,
          labwareId: labwareId,
          loadName,
          namespace: namespace,
          version: version,
          location,
        },
      }

      return [...acc, loadLabwareCommands]
    },
    []
  )

  const loadLiquidCommands = getLoadLiquidCommands(
    liquidEntities,
    ingredLocations
  )

  const loadModuleCommands = map(
    initialRobotState.modules,
    (
      module: typeof initialRobotState.modules[keyof typeof initialRobotState.modules],
      moduleId: string
    ): LoadModuleCreateCommand => {
      const model = moduleEntities[moduleId].model
      const loadModuleCommand = {
        key: uuid(),
        commandType: 'loadModule' as const,
        params: {
          model: model,
          location: {
            slotName: module.slot,
          },
          moduleId: moduleId,
        },
      }
      return loadModuleCommand
    }
  )

  return [
    ...loadPipetteCommands,
    ...loadModuleCommands,
    ...loadAdapterCommands,
    ...loadLabwareCommands,
    ...loadLiquidCommands,
  ]
}
