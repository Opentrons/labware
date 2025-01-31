import { getHasWasteChute } from '@opentrons/step-generation'
import { WASTE_CHUTE_DISPLAY_NAME } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import type { RobotType } from '@opentrons/shared-data'
import type { InitialDeckSetup, SavedStepFormState } from '../../step-forms'

function resolveSlotLocation(
  modules: InitialDeckSetup['modules'],
  labware: InitialDeckSetup['labware'],
  location: string,
  robotType: RobotType
): string {
  const TCSlot =
    robotType === FLEX_ROBOT_TYPE
      ? TC_MODULE_LOCATION_OT3
      : TC_MODULE_LOCATION_OT2
  if (location === 'offDeck') {
    return 'offDeck'
  } else if (modules[location] != null) {
    return modules[location].type === THERMOCYCLER_MODULE_TYPE
      ? TCSlot
      : modules[location].slot
  } else if (labware[location] != null) {
    const adapter = labware[location]
    if (modules[adapter.slot] != null) {
      return modules[adapter.slot].type === THERMOCYCLER_MODULE_TYPE
        ? TCSlot
        : modules[adapter.slot].slot
    } else {
      return adapter.slot
    }
  } else {
    return location
  }
}

export function getLabwareLatestSlot(
  initialDeckSetup: InitialDeckSetup,
  savedStepForms: SavedStepFormState,
  labwareId: string,
  robotType: RobotType
): string | null {
  const { modules, labware, additionalEquipmentOnDeck } = initialDeckSetup
  const initialSlot = labware[labwareId]?.slot
  const hasWasteChute = getHasWasteChute(additionalEquipmentOnDeck)

  //  latest moveLabware step related to labwareId
  const moveLabwareStep = Object.values(savedStepForms)
    .filter(
      state =>
        state.stepType === 'moveLabware' &&
        labwareId != null &&
        labwareId === state.labware
    )
    .reverse()[0]

  if (
    hasWasteChute &&
    (initialSlot === 'D3' || moveLabwareStep?.newLocation === 'D3')
  ) {
    return WASTE_CHUTE_DISPLAY_NAME
  }

  if (moveLabwareStep?.newLocation != null) {
    return resolveSlotLocation(
      modules,
      labware,
      moveLabwareStep.newLocation as string,
      robotType
    )
  } else if (moveLabwareStep == null) {
    return resolveSlotLocation(modules, labware, initialSlot, robotType)
  } else {
    console.warn(
      `Expected to find labware's location but could not with initial slot ${initialSlot}`
    )
    return null
  }
}
