import {
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
  getPipetteSpecsV2,
} from '@opentrons/shared-data'

import { getPipetteNameOnMount } from '../getPipetteNameOnMount'
import { getLiquidDisplayName } from '../getLiquidDisplayName'
import { getLabwareName } from '../getLabwareName'
import { getLabwareDisplayLocation } from '../getLabwareDisplayLocation'

import type { GetCommandText } from '../..'

export const getLoadCommandText = ({
  command,
  commandTextData,
  robotType,
  t,
  allRunDefs,
}: GetCommandText): string => {
  switch (command?.commandType) {
    case 'loadPipette': {
      const pipetteModel =
        commandTextData != null
          ? getPipetteNameOnMount(
              commandTextData.pipettes,
              command.params.mount
            )
          : null
      return t('load_pipette_protocol_setup', {
        pipette_name:
          pipetteModel != null
            ? getPipetteSpecsV2(pipetteModel)?.displayName ?? ''
            : '',
        mount_name: command.params.mount === 'left' ? t('left') : t('right'),
      })
    }
    case 'loadModule': {
      const occludedSlotCount = getOccludedSlotCountForModule(
        getModuleType(command.params.model),
        robotType
      )
      return t('load_module_protocol_setup', {
        count: occludedSlotCount,
        module: getModuleDisplayName(command.params.model),
        slot_name: command.params.location.slotName,
      })
    }
    case 'loadLabware': {
      const location = getLabwareDisplayLocation({
        location: command.params.location,
        robotType,
        allRunDefs,
        loadedLabwares: commandTextData?.labware ?? [],
        loadedModules: commandTextData?.modules ?? [],
        t,
      })
      const labwareName = command.result?.definition.metadata.displayName
      // use in preposition for modules and slots, on for labware and adapters
      let displayLocation = t('in_location', { location })
      if (
        command.params.location === 'offDeck' ||
        command.params.location === 'systemLocation'
      ) {
        displayLocation = location
      } else if ('labwareId' in command.params.location) {
        displayLocation = t('on_location', { location })
      }

      return t('load_labware_to_display_location', {
        labware: labwareName,
        display_location: displayLocation,
      })
    }
    // TODO(sb, 01/29): Add full support for these commands in run log once location refactor is complete
    case 'loadLid': {
      return t('load_lid')
    }
    case 'loadLidStack': {
      return t('load_lid_stack')
    }
    case 'reloadLabware': {
      const { labwareId } = command.params
      const labware =
        commandTextData != null
          ? getLabwareName({
              loadedLabwares: commandTextData?.labware ?? [],
              labwareId,
              allRunDefs,
            })
          : null
      return t('reloading_labware', { labware })
    }
    case 'loadLiquid': {
      const { liquidId, labwareId } = command.params
      return t('load_liquids_info_protocol_setup', {
        liquid:
          commandTextData != null
            ? getLiquidDisplayName(commandTextData.liquids ?? [], liquidId)
            : null,
        labware:
          commandTextData != null
            ? getLabwareName({
                loadedLabwares: commandTextData?.labware ?? [],
                labwareId,
                allRunDefs,
              })
            : null,
      })
    }
    default: {
      console.warn(
        'LoadCommandText encountered a command with an unrecognized commandType: ',
        command
      )
      return ''
    }
  }
}
