import {
  FIXED_TRASH_ID,
  FLEX_MODULE_ADDRESSABLE_AREAS,
  getAreSlotsAdjacent,
  getDeckDefFromRobotType,
  getIsLabwareAboveHeight,
  HEATERSHAKER_MODULE_TYPE,
  MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import { COLUMN_4_SLOTS } from '@opentrons/step-generation'
import { getSlotIsEmpty } from '../step-forms/utils'
import { getStagingAreaAddressableAreas } from '../utils'
import type {
  RobotType,
  CutoutId,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { InitialDeckSetup } from '../step-forms/types'
import type { DeckSlot } from '../types'

export function getNextAvailableDeckSlot(
  initialDeckSetup: InitialDeckSetup,
  robotType: RobotType,
  labwareDefinition?: LabwareDefinition2
): DeckSlot | null | undefined {
  const deckDef = getDeckDefFromRobotType(robotType)
  const heaterShakerSlot = Object.values(initialDeckSetup.modules).find(
    module => module.type === HEATERSHAKER_MODULE_TYPE
  )?.slot

  const hasTC = Object.values(initialDeckSetup.modules).find(
    module => module.type === THERMOCYCLER_MODULE_TYPE
  )
  let moduleSlots = Object.values(initialDeckSetup.modules)
    .filter(module => module.slot)
    .map(mod => mod.slot)
  if (hasTC) {
    moduleSlots = [...moduleSlots, '8', '10', '11']
  }

  return deckDef.locations.addressableAreas.find(slot => {
    const cutoutIds = Object.values(initialDeckSetup.additionalEquipmentOnDeck)
      .filter(ae => ae.name === 'stagingArea')
      .map(ae => ae.location as CutoutId)
    const stagingAreaAddressableAreaNames = getStagingAreaAddressableAreas(
      cutoutIds
    )
    const addressableAreaName = stagingAreaAddressableAreaNames.find(
      aa => aa === slot.id
    )
    let isSlotEmpty: boolean = getSlotIsEmpty(initialDeckSetup, slot.id)
    if (addressableAreaName == null && COLUMN_4_SLOTS.includes(slot.id)) {
      isSlotEmpty = false
    } else if (
      MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(slot.id) ||
      WASTE_CHUTE_ADDRESSABLE_AREAS.includes(slot.id) ||
      slot.id === FIXED_TRASH_ID
    ) {
      isSlotEmpty = false
    } else if (
      moduleSlots.includes(slot.id) ||
      FLEX_MODULE_ADDRESSABLE_AREAS.includes(slot.id)
    ) {
      isSlotEmpty = false
      //  return slot as full if slot is adjacent to heater-shaker for ot-2 and taller than 53mm
    } else if (
      heaterShakerSlot != null &&
      robotType === OT2_ROBOT_TYPE &&
      isSlotEmpty &&
      labwareDefinition != null
    ) {
      isSlotEmpty =
        !getAreSlotsAdjacent(heaterShakerSlot, slot.id) ||
        !(
          getAreSlotsAdjacent(heaterShakerSlot, slot.id) &&
          getIsLabwareAboveHeight(
            labwareDefinition,
            MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM
          )
        )
    }
    return isSlotEmpty
  })?.id
}

const getMatchOrNull = (
  pattern: RegExp,
  s: string
): string | null | undefined => {
  const matchResult = pattern.exec(s)
  return matchResult ? matchResult[1] : null
}

const nameOnlyPattern = /^(.*)\(\d+\)$/
const numOnlyPattern = /^.*\((\d+)\)$/
export function getNextNickname(
  allNicknames: string[],
  _proposedNickname: string
): string {
  const proposedNickname = (
    getMatchOrNull(nameOnlyPattern, _proposedNickname) || _proposedNickname
  ).trim()

  const matchingDisambigNums = allNicknames.reduce<number[]>(
    (acc, nickname) => {
      const nameOnly = (
        getMatchOrNull(nameOnlyPattern, nickname) || nickname
      ).trim()
      const numOnlyMatch = getMatchOrNull(numOnlyPattern, nickname)
      const num = numOnlyMatch ? Number(numOnlyMatch) : 0

      // only include matching names
      if (nameOnly === proposedNickname) {
        return [...acc, num]
      }

      return acc
    },
    []
  )
  const topMatchNum = Math.max(...matchingDisambigNums)
  return Number.isFinite(topMatchNum)
    ? `${proposedNickname.trim()} (${topMatchNum + 1})`
    : proposedNickname
}
