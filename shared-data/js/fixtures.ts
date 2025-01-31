import {
  FLEX_ROBOT_TYPE,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  A1_ADDRESSABLE_AREA,
  A2_ADDRESSABLE_AREA,
  A3_ADDRESSABLE_AREA,
  B1_ADDRESSABLE_AREA,
  B2_ADDRESSABLE_AREA,
  B3_ADDRESSABLE_AREA,
  C1_ADDRESSABLE_AREA,
  C2_ADDRESSABLE_AREA,
  C3_ADDRESSABLE_AREA,
  D1_ADDRESSABLE_AREA,
  D2_ADDRESSABLE_AREA,
  D3_ADDRESSABLE_AREA,
  ADDRESSABLE_AREA_1,
  ADDRESSABLE_AREA_2,
  ADDRESSABLE_AREA_3,
  ADDRESSABLE_AREA_4,
  ADDRESSABLE_AREA_5,
  ADDRESSABLE_AREA_6,
  ADDRESSABLE_AREA_7,
  ADDRESSABLE_AREA_8,
  ADDRESSABLE_AREA_9,
  ADDRESSABLE_AREA_10,
  ADDRESSABLE_AREA_11,
  HEATERSHAKER_MODULE_V1_FIXTURE,
  HEATERSHAKER_MODULE_V1,
  TEMPERATURE_MODULE_V2_FIXTURE,
  TEMPERATURE_MODULE_V2,
  MAGNETIC_BLOCK_V1_FIXTURE,
  MAGNETIC_BLOCK_V1,
  THERMOCYCLER_V2_REAR_FIXTURE,
  THERMOCYCLER_MODULE_V2,
  THERMOCYCLER_V2_FRONT_FIXTURE,
  ABSORBANCE_READER_V1_FIXTURE,
  ABSORBANCE_READER_V1,
  MODULE_FIXTURES_BY_MODEL,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
} from './constants'
import { getModuleDisplayName } from './modules'
import { getCutoutIdForSlotName } from './helpers'
import type {
  AddressableAreaName,
  CutoutFixtureId,
  CutoutId,
  OT2CutoutId,
} from '../deck'
import type {
  AddressableArea,
  CoordinateTuple,
  CutoutFixture,
  DeckDefinition,
  ModuleModel,
} from './types'
import type { ModuleLocation } from '../command'

export function getCutoutDisplayName(cutout: CutoutId): string {
  return cutout.replace('cutout', '')
}

// mapping of OT-2 deck slots to cutouts
export const OT2_CUTOUT_BY_SLOT_ID: { [slotId: string]: OT2CutoutId } = {
  1: 'cutout1',
  2: 'cutout2',
  3: 'cutout3',
  4: 'cutout4',
  5: 'cutout5',
  6: 'cutout6',
  7: 'cutout7',
  8: 'cutout8',
  9: 'cutout9',
  10: 'cutout10',
  11: 'cutout11',
  fixedTrash: 'cutout12',
}

// mapping of Flex deck slots to cutouts
export const FLEX_CUTOUT_BY_SLOT_ID: { [slotId: string]: CutoutId } = {
  A1: 'cutoutA1',
  A2: 'cutoutA2',
  A3: 'cutoutA3',
  A4: 'cutoutA3',
  B1: 'cutoutB1',
  B2: 'cutoutB2',
  B3: 'cutoutB3',
  B4: 'cutoutB3',
  C1: 'cutoutC1',
  C2: 'cutoutC2',
  C3: 'cutoutC3',
  C4: 'cutoutC3',
  D1: 'cutoutD1',
  D2: 'cutoutD2',
  D3: 'cutoutD3',
  D4: 'cutoutD3',
}

// mapping of Flex single slot cutouts to deck slots
export const FLEX_SINGLE_SLOT_BY_CUTOUT_ID: { [CutoutId: string]: string } = {
  cutoutA1: 'A1',
  cutoutA2: 'A2',
  cutoutA3: 'A3',
  cutoutB1: 'B1',
  cutoutB2: 'B2',
  cutoutB3: 'B3',
  cutoutC1: 'C1',
  cutoutC2: 'C2',
  cutoutC3: 'C3',
  cutoutD1: 'D1',
  cutoutD2: 'D2',
  cutoutD3: 'D3',
}

// TODO(jh 01-15-25): Instead of typing slotId as `string`, type it as `AddressableAreaName`.
// returns the position associated with a slot id
export function getPositionFromSlotId(
  slotId: string,
  deckDef: DeckDefinition
): CoordinateTuple | null {
  const cutoutWithSlot =
    deckDef.robot.model === FLEX_ROBOT_TYPE
      ? FLEX_CUTOUT_BY_SLOT_ID[slotId]
      : OT2_CUTOUT_BY_SLOT_ID[slotId]

  const cutoutPosition =
    deckDef.locations.cutouts.find(cutout => cutout.id === cutoutWithSlot)
      ?.position ?? null

  // adjust for offset from cutout
  const offsetFromCutoutFixture = getAddressableAreaFromSlotId(slotId, deckDef)
    ?.offsetFromCutoutFixture ?? [0, 0, 0]

  const slotPosition: CoordinateTuple | null =
    cutoutPosition != null
      ? [
          cutoutPosition[0] + offsetFromCutoutFixture[0],
          cutoutPosition[1] + offsetFromCutoutFixture[1],
          cutoutPosition[2] + offsetFromCutoutFixture[2],
        ]
      : null

  return slotPosition
}

export function getAddressableAreaFromSlotId(
  slotId: string,
  deckDef: DeckDefinition
): AddressableArea | null {
  return (
    deckDef.locations.addressableAreas.find(
      addressableArea => addressableArea.id === slotId
    ) ?? null
  )
}

export function getCutoutFixtureIdsForModuleModel(
  moduleModel: ModuleModel
): CutoutFixtureId[] {
  const moduleFixtures = MODULE_FIXTURES_BY_MODEL[moduleModel]
  return moduleFixtures ?? []
}

export function getCutoutFixturesForModuleModel(
  moduleModel: ModuleModel,
  deckDef: DeckDefinition
): CutoutFixture[] {
  const moduleFixtureIds = getCutoutFixtureIdsForModuleModel(moduleModel)
  return moduleFixtureIds.reduce<CutoutFixture[]>((acc, id) => {
    const moduleFixture = deckDef.cutoutFixtures.find(cf => cf.id === id)
    return moduleFixture != null ? [...acc, moduleFixture] : acc
  }, [])
}

export function getFixtureIdByCutoutIdFromModuleAnchorCutoutId(
  anchorCutoutId: CutoutId | null,
  moduleFixtures: CutoutFixture[] // cutout fixtures for a specific module model
): { [cutoutId in CutoutId]?: CutoutFixtureId } {
  // find the first fixture for this specific module model that may mount to the cutout implied by the slotName
  const anchorFixture = moduleFixtures.find(fixture =>
    fixture.mayMountTo.some(cutoutId => cutoutId === anchorCutoutId)
  )
  if (anchorCutoutId != null && anchorFixture != null) {
    const groupedFixtures = anchorFixture.fixtureGroup[anchorCutoutId]
    return groupedFixtures?.[0] ?? { [anchorCutoutId]: anchorFixture.id }
  }
  return {}
}

export function getFixtureIdByCutoutIdFromModuleSlotName(
  slotName: string,
  moduleFixtures: CutoutFixture[], // cutout fixtures for a specific module model
  deckDef: DeckDefinition
): { [cutoutId in CutoutId]?: CutoutFixtureId } {
  const anchorCutoutId = getCutoutIdForSlotName(slotName, deckDef)
  return getFixtureIdByCutoutIdFromModuleAnchorCutoutId(
    anchorCutoutId,
    moduleFixtures
  )
}

export function getCutoutIdsFromModuleSlotName(
  slotName: string,
  moduleFixtures: CutoutFixture[], // cutout fixtures for a specific module model
  deckDef: DeckDefinition
): CutoutId[] {
  const fixtureIdByCutoutId = getFixtureIdByCutoutIdFromModuleSlotName(
    slotName,
    moduleFixtures,
    deckDef
  )
  return Object.keys(fixtureIdByCutoutId) as CutoutId[]
}

export function getAddressableAreaNamesFromLoadedModule(
  moduleModel: ModuleModel,
  slotName: ModuleLocation['slotName'],
  deckDef: DeckDefinition
): AddressableAreaName[] {
  const moduleFixtures = getCutoutFixturesForModuleModel(moduleModel, deckDef)
  const cutoutIds = getCutoutIdsFromModuleSlotName(
    slotName,
    moduleFixtures,
    deckDef
  )
  return moduleFixtures.reduce<AddressableAreaName[]>((acc, cutoutFixture) => {
    const providedAddressableAreas = cutoutIds.reduce<AddressableAreaName[]>(
      (innerAcc, cutoutId) => {
        const newAddressableAreas =
          cutoutFixture?.providesAddressableAreas[cutoutId] ?? []
        return [...innerAcc, ...newAddressableAreas]
      },
      []
    )
    return [...acc, ...providedAddressableAreas]
  }, [])
}
// note: we've decided not to translate these strings
export function getFixtureDisplayName(
  cutoutFixtureId: CutoutFixtureId | null,
  usbPortNumber?: number
): string {
  switch (cutoutFixtureId) {
    case STAGING_AREA_RIGHT_SLOT_FIXTURE:
      return 'Staging area slot'
    case TRASH_BIN_ADAPTER_FIXTURE:
      return 'Trash bin'
    case WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE:
      return 'Waste chute only'
    case WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE:
      return 'Waste chute only with cover'
    case STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE:
      return 'Waste chute with staging area slot'
    case STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE:
      return 'Waste chute with staging area slot and cover'
    case HEATERSHAKER_MODULE_V1_FIXTURE:
      return usbPortNumber != null
        ? `${getModuleDisplayName(
            HEATERSHAKER_MODULE_V1
          )} in USB-${usbPortNumber}`
        : getModuleDisplayName(HEATERSHAKER_MODULE_V1)
    case TEMPERATURE_MODULE_V2_FIXTURE:
      return usbPortNumber != null
        ? `${getModuleDisplayName(
            TEMPERATURE_MODULE_V2
          )} in USB-${usbPortNumber}`
        : getModuleDisplayName(TEMPERATURE_MODULE_V2)
    case MAGNETIC_BLOCK_V1_FIXTURE:
      return `${getModuleDisplayName(MAGNETIC_BLOCK_V1)}`
    case STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE:
      return `${getModuleDisplayName(MAGNETIC_BLOCK_V1)} with staging area slot`
    case THERMOCYCLER_V2_REAR_FIXTURE:
      return usbPortNumber != null
        ? `${getModuleDisplayName(
            THERMOCYCLER_MODULE_V2
          )} in USB-${usbPortNumber}`
        : getModuleDisplayName(THERMOCYCLER_MODULE_V2)
    case THERMOCYCLER_V2_FRONT_FIXTURE:
      return usbPortNumber != null
        ? `${getModuleDisplayName(
            THERMOCYCLER_MODULE_V2
          )} in USB-${usbPortNumber}`
        : getModuleDisplayName(THERMOCYCLER_MODULE_V2)
    case ABSORBANCE_READER_V1_FIXTURE:
      return usbPortNumber != null
        ? `${getModuleDisplayName(
            ABSORBANCE_READER_V1
          )} in USB-${usbPortNumber}`
        : getModuleDisplayName(ABSORBANCE_READER_V1)
    default:
      return 'Slot'
  }
}

export const STANDARD_OT2_SLOTS: AddressableAreaName[] = [
  ADDRESSABLE_AREA_1,
  ADDRESSABLE_AREA_2,
  ADDRESSABLE_AREA_3,
  ADDRESSABLE_AREA_4,
  ADDRESSABLE_AREA_5,
  ADDRESSABLE_AREA_6,
  ADDRESSABLE_AREA_7,
  ADDRESSABLE_AREA_8,
  ADDRESSABLE_AREA_9,
  ADDRESSABLE_AREA_10,
  ADDRESSABLE_AREA_11,
]

export const STANDARD_FLEX_SLOTS: AddressableAreaName[] = [
  A1_ADDRESSABLE_AREA,
  A2_ADDRESSABLE_AREA,
  A3_ADDRESSABLE_AREA,
  B1_ADDRESSABLE_AREA,
  B2_ADDRESSABLE_AREA,
  B3_ADDRESSABLE_AREA,
  C1_ADDRESSABLE_AREA,
  C2_ADDRESSABLE_AREA,
  C3_ADDRESSABLE_AREA,
  D1_ADDRESSABLE_AREA,
  D2_ADDRESSABLE_AREA,
  D3_ADDRESSABLE_AREA,
]

export const isAddressableAreaStandardSlot = (
  addressableAreaName: AddressableAreaName,
  deckDef: DeckDefinition
): boolean =>
  (deckDef.robot.model === FLEX_ROBOT_TYPE
    ? STANDARD_FLEX_SLOTS
    : STANDARD_OT2_SLOTS
  ).includes(addressableAreaName)
