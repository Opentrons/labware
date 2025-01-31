import {
  getModuleDisplayName,
  getModuleType,
  THERMOCYCLER_MODULE_TYPE,
  getLabwareDefURI,
} from '@opentrons/shared-data'
import type { i18n, TFunction } from 'i18next'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { LegacyLabwareOffsetLocation } from '@opentrons/api-client'

export function getDisplayLocation(
  location: LegacyLabwareOffsetLocation,
  labwareDefinitions: LabwareDefinition2[],
  t: TFunction,
  i18n: i18n,
  slotOnly?: boolean
): string {
  const slotDisplayLocation = i18n.format(
    t('slot_name', { slotName: location.slotName }),
    'titleCase'
  )
  if (slotOnly) {
    return slotDisplayLocation
  }

  if ('definitionUri' in location && location.definitionUri != null) {
    const adapterDisplayName = labwareDefinitions.find(
      def => getLabwareDefURI(def) === location.definitionUri
    )?.metadata.displayName

    if ('moduleModel' in location && location.moduleModel != null) {
      const { moduleModel } = location
      const moduleDisplayName = getModuleDisplayName(moduleModel)
      if (getModuleType(moduleModel) === THERMOCYCLER_MODULE_TYPE) {
        return t('adapter_in_tc', {
          adapter: adapterDisplayName,
          module: moduleDisplayName,
        })
      } else {
        return t('adapter_in_mod_in_slot', {
          adapter: adapterDisplayName,
          module: moduleDisplayName,
          slot: slotDisplayLocation,
        })
      }
    } else {
      return t('adapter_in_slot', {
        adapter: adapterDisplayName,
        slot: slotDisplayLocation,
      })
    }
  } else if ('moduleModel' in location && location.moduleModel != null) {
    const { moduleModel } = location
    const moduleDisplayName = getModuleDisplayName(moduleModel)
    if (getModuleType(moduleModel) === THERMOCYCLER_MODULE_TYPE) {
      return moduleDisplayName
    } else {
      return t('module_in_slot', {
        module: moduleDisplayName,
        slot: slotDisplayLocation,
      })
    }
  } else {
    return slotDisplayLocation
  }
}
