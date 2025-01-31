import values from 'lodash/values'
import {
  ABSORBANCE_READER_TYPE,
  getLabwareDefaultEngageHeight,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import type { DropdownOption } from '@opentrons/components'
import type { ModuleType } from '@opentrons/shared-data'
import type {
  ModuleOnDeck,
  LabwareOnDeck,
  InitialDeckSetup,
} from '../../step-forms/types'
import type { SavedStepFormState } from '../../step-forms'

export function getModuleOnDeckByType(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): ModuleOnDeck | null | undefined {
  return values(initialDeckSetup.modules).find(
    (moduleOnDeck: ModuleOnDeck) => moduleOnDeck.type === type
  )
}
export function getModulesOnDeckByType(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): ModuleOnDeck[] | null | undefined {
  return values(initialDeckSetup.modules).filter(
    (moduleOnDeck: ModuleOnDeck) => moduleOnDeck.type === type
  )
}
export function getLabwareOnModule(
  initialDeckSetup: InitialDeckSetup,
  moduleId: string
): LabwareOnDeck | null | undefined {
  return values(initialDeckSetup.labware).find(
    (labware: LabwareOnDeck) =>
      labware.slot === moduleId ||
      //  acccount for adapter!
      values(initialDeckSetup.labware).find(
        adapter => adapter.id === labware.slot && adapter.slot === moduleId
      )
  )
}
export function getModuleUnderLabware(
  initialDeckSetup: InitialDeckSetup,
  savedStepFormState: SavedStepFormState,
  labwareId: string
): ModuleOnDeck | null | undefined {
  //  latest moveLabware step related to labwareId
  const moveLabwareStep = Object.values(savedStepFormState)
    .filter(
      state =>
        state.stepType === 'moveLabware' &&
        labwareId != null &&
        state.labware === labwareId
    )
    .reverse()[0]
  const newLocation = moveLabwareStep?.newLocation

  return values(initialDeckSetup.modules).find((moduleOnDeck: ModuleOnDeck) => {
    const labwareSlot = initialDeckSetup.labware[labwareId]?.slot
    let location
    if (newLocation != null) {
      location = newLocation
    } else if (
      labwareSlot != null &&
      initialDeckSetup.labware[labwareSlot] != null
    ) {
      location = initialDeckSetup.labware[labwareSlot].slot
    } else {
      location = labwareSlot
    }
    return location === moduleOnDeck.id
  })
}

export const getModuleShortNames = (type: ModuleType): string => {
  switch (type) {
    case HEATERSHAKER_MODULE_TYPE:
      return 'Heater-Shaker Module'
    case MAGNETIC_BLOCK_TYPE:
      return 'Magnetic Block'
    case MAGNETIC_MODULE_TYPE:
      return 'Magnetic Module'
    case TEMPERATURE_MODULE_TYPE:
      return 'Temperature Module'
    case THERMOCYCLER_MODULE_TYPE:
      return 'Thermocycler'
    case ABSORBANCE_READER_TYPE:
      return 'Absorbance Reader'
  }
}

export function getModuleLabwareOptions(
  initialDeckSetup: InitialDeckSetup,
  nicknamesById: Record<string, string>,
  type: ModuleType
): DropdownOption[] {
  const labwares = initialDeckSetup.labware
  const modulesOnDeck = getModulesOnDeckByType(initialDeckSetup, type)
  const module = getModuleShortNames(type)
  let options: DropdownOption[] = []

  if (modulesOnDeck != null) {
    options = modulesOnDeck.map(moduleOnDeck => {
      const labware = getLabwareOnModule(initialDeckSetup, moduleOnDeck.id)
      if (labware) {
        const labwareOnAdapterId = Object.values(labwares).find(
          lw => lw.slot === labware.id
        )?.id
        if (labwareOnAdapterId != null) {
          return {
            name: `${nicknamesById[labware.id]} with ${
              nicknamesById[labwareOnAdapterId]
            }`,
            deckLabel: moduleOnDeck.slot,
            subtext: module,
            value: moduleOnDeck.id,
          }
        } else {
          return {
            name: nicknamesById[labware.id],
            deckLabel: moduleOnDeck.slot,
            subtext: module,
            value: moduleOnDeck.id,
          }
        }
      } else {
        return {
          name: module,
          deckLabel: moduleOnDeck.slot,
          value: moduleOnDeck.id,
        }
      }
    })
  }

  return options
}
export function getModuleHasLabware(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): boolean {
  const moduleOnDeck = getModuleOnDeckByType(initialDeckSetup, type)
  const labware =
    moduleOnDeck && getLabwareOnModule(initialDeckSetup, moduleOnDeck.id)
  return Boolean(moduleOnDeck) && Boolean(labware)
}

export interface ModuleAndLabware {
  moduleId: string
  hasLabware: boolean
}

export function getModulesHaveLabware(
  initialDeckSetup: InitialDeckSetup,
  type: ModuleType
): ModuleAndLabware[] {
  const modulesOnDeck = getModulesOnDeckByType(initialDeckSetup, type)
  const moduleAndLabware: ModuleAndLabware[] = []
  modulesOnDeck?.forEach(module => {
    const labwareHasModule = getLabwareOnModule(initialDeckSetup, module.id)

    moduleAndLabware.push({
      moduleId: module.id,
      hasLabware: labwareHasModule != null,
    })
  })
  return moduleAndLabware
}

export const getMagnetLabwareEngageHeight = (
  initialDeckSetup: InitialDeckSetup,
  magnetModuleId: string | null
): number | null => {
  if (magnetModuleId == null) return null
  const moduleModel = initialDeckSetup.modules[magnetModuleId]?.model
  const labware = getLabwareOnModule(initialDeckSetup, magnetModuleId)
  const engageHeightMm = labware
    ? getLabwareDefaultEngageHeight(labware.def)
    : null

  if (engageHeightMm != null && moduleModel === MAGNETIC_MODULE_V1) {
    // convert to 'short mm' units for GEN1
    return engageHeightMm * 2
  }

  return engageHeightMm
}
