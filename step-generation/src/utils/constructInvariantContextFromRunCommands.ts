import {
  getModuleType,
  getLabwareDefURI,
  getPipetteSpecsV2,
} from '@opentrons/shared-data'
import type {
  LoadLabwareRunTimeCommand,
  RunTimeCommand,
  PickUpTipRunTimeCommand,
} from '@opentrons/shared-data'
import type {
  InvariantContext,
  LabwareEntities,
  PipetteEntities,
  ModuleEntities,
  AdditionalEquipmentEntities,
  AdditionalEquipmentName,
} from '../types'
import { uuid } from '.'

export function constructInvariantContextFromRunCommands(
  commands: RunTimeCommand[]
): InvariantContext {
  return commands.reduce(
    (acc: InvariantContext, command: RunTimeCommand) => {
      if (command.commandType === 'loadLabware' && command.result != null) {
        const result = command.result
        const labwareEntities: LabwareEntities = {
          ...acc.labwareEntities,
          [result.labwareId]: {
            id: result.labwareId,
            labwareDefURI: getLabwareDefURI(result.definition),
            def: result.definition,
          },
        }
        return {
          ...acc,
          labwareEntities,
        }
      } else if (
        command.commandType === 'loadModule' &&
        command.result != null
      ) {
        const result = command.result
        const moduleEntities: ModuleEntities = {
          ...acc.moduleEntities,
          [result.moduleId]: {
            id: result.moduleId,
            type: getModuleType(command.params.model),
            model: command.params.model,
          },
        }
        return {
          ...acc,
          moduleEntities,
        }
      } else if (
        command.commandType === 'loadPipette' &&
        command.result != null
      ) {
        const result = command.result
        const labwareId =
          commands.find(
            (c): c is PickUpTipRunTimeCommand =>
              c.commandType === 'pickUpTip' &&
              c.params.pipetteId === result.pipetteId
          )?.params.labwareId ?? null
        const matchingCommand =
          commands.find(
            (c): c is LoadLabwareRunTimeCommand =>
              c.commandType === 'loadLabware' &&
              c.result != null &&
              c.result.labwareId === labwareId
          ) ?? null

        const tiprackLabwareDef =
          matchingCommand != null && matchingCommand.result != null
            ? matchingCommand.result.definition ?? null
            : null
        const specs: any = getPipetteSpecsV2(command.params.pipetteName)

        const pipetteEntities: PipetteEntities = {
          ...acc.pipetteEntities,
          [result.pipetteId]: {
            name: command.params.pipetteName,
            id: command.params.pipetteId,
            tiprackLabwareDef:
              tiprackLabwareDef != null ? [tiprackLabwareDef] : [],
            tiprackDefURI:
              tiprackLabwareDef != null
                ? [getLabwareDefURI(tiprackLabwareDef)]
                : [],
            spec: specs,
          },
        }
        return {
          ...acc,
          pipetteEntities,
        }
      } else if (
        command.commandType === 'moveToAddressableArea' ||
        command.commandType === 'moveToAddressableAreaForDropTip'
      ) {
        const addressableAreaName = command.params.addressableAreaName
        const id = `${uuid()}:${addressableAreaName}`
        let name: AdditionalEquipmentName = 'trashBin'
        let location
        if (addressableAreaName === 'fixedTrash') {
          location = '12'
        } else if (addressableAreaName.includes('WasteChute')) {
          location = 'D3'
          name = 'wasteChute'
        } else if (addressableAreaName.includes('movableTrash')) {
          location = addressableAreaName.split('movableTrash')[1]
        }
        const additionalEquipmentEntities: AdditionalEquipmentEntities = {
          ...acc.additionalEquipmentEntities,
          [id]: {
            name,
            id,
            location,
          },
        }
        return {
          ...acc,
          additionalEquipmentEntities,
        }
      }

      return acc
    },
    {
      labwareEntities: {},
      moduleEntities: {},
      pipetteEntities: {},
      additionalEquipmentEntities: {},
      //  this util is used for the timeline scrubber. It grabs liquid info from analysis
      //  so this will not be wired up right now
      liquidEntities: {},
      config: { OT_PD_DISABLE_MODULE_RESTRICTIONS: true },
    }
  )
}
