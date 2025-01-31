import uniq from 'lodash/uniq'

import { OPENTRONS_LABWARE_NAMESPACE } from '../constants'
import standardOt2DeckDef from '../../deck/definitions/5/ot2_standard.json'
import standardFlexDeckDef from '../../deck/definitions/5/ot3_standard.json'
import type {
  DeckDefinition,
  LabwareDefinition2,
  ModuleModel,
  RobotType,
  ThermalAdapterName,
} from '../types'
import type { AddressableAreaName, CutoutId } from '../../deck/types/schemaV5'

export { getWellNamePerMultiTip } from './getWellNamePerMultiTip'
export { getWellTotalVolume } from './getWellTotalVolume'
export { wellIsRect } from './wellIsRect'
export { orderWells } from './orderWells'
export { get96Channel384WellPlateWells } from './get96Channel384WellPlateWells'
export { getTipTypeFromTipRackDefinition } from './getTipTypeFromTipRackDefinition'

export * from './__fixtures__'
export * from './parseProtocolCommands'
export * from './parseProtocolData'
export * from './volume'
export * from './wellSets'
export * from './getAreFlexSlotsAdjacent'
export * from './getModuleVizDims'
export * from './getVectorDifference'
export * from './getVectorSum'
export * from './getLoadedLabwareDefinitionsByUri'
export * from './getFixedTrashLabwareDefinition'
export * from './getOccludedSlotCountForModule'
export * from './labwareInference'
export * from './getAddressableAreasInProtocol'
export * from './getFlexSurroundingSlots'
export * from './getSimplestFlexDeckConfig'
export * from './formatRunTimeParameterDefaultValue'
export * from './formatRunTimeParameterValue'
export * from './formatRunTimeParameterMinMax'
export * from './orderRuntimeParameterRangeOptions'
export * from './sortRunTimeParameters'

export const getLabwareDefIsStandard = (def: LabwareDefinition2): boolean =>
  def?.namespace === OPENTRONS_LABWARE_NAMESPACE

export const getLabwareDefURI = (def: LabwareDefinition2): string =>
  constructLabwareDefURI(
    def.namespace,
    def.parameters.loadName,
    String(def.version)
  )

export const constructLabwareDefURI = (
  namespace: string,
  loadName: string,
  version: string
): string => `${namespace}/${loadName}/${version}`

// Load names of "retired" labware
// TODO(mc, 2019-12-3): how should this correspond to LABWAREV2_DO_NOT_LIST?
// see shared-data/js/getLabware.js
export const RETIRED_LABWARE = [
  'geb_96_tiprack_10ul',
  'geb_96_tiprack_1000ul',
  'opentrons_1_trash_850ml_fixed',
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic',
  'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap_acrylic',
  'opentrons_24_tuberack_generic_0.75ml_snapcap_acrylic',
  'opentrons_40_aluminumblock_eppendorf_24x2ml_safelock_snapcap_generic_16x0.2ml_pcr_strip',
  'opentrons_96_aluminumblock_biorad_wellplate_200ul',
  'tipone_96_tiprack_200ul',
  'eppendorf_96_tiprack_1000ul_eptips',
  'eppendorf_96_tiprack_10ul_eptips',
  // Replaced by opentrons_96_wellplate_200ul_pcr_full_skirt
  // https://opentrons.atlassian.net/browse/RLAB-230
  'armadillo_96_wellplate_200ul_pcr_full_skirt',
]

export const getLabwareDisplayName = (
  labwareDef: LabwareDefinition2
): string => {
  const { displayName } = labwareDef.metadata

  if (
    getLabwareDefIsStandard(labwareDef) &&
    RETIRED_LABWARE.includes(labwareDef.parameters.loadName)
  ) {
    return `(Retired) ${displayName}`
  }

  return displayName
}

export const getTiprackVolume = (labwareDef: LabwareDefinition2): number => {
  console.assert(
    labwareDef.parameters.isTiprack,
    `getTiprackVolume expected a tiprack labware ${getLabwareDefURI(
      labwareDef
    )}, but 'isTiprack' isn't true`
  )
  // NOTE: Ian 2019-04-16 assuming all tips are the same volume across the rack
  const volume = labwareDef.wells.A1.totalLiquidVolume
  console.assert(
    volume >= 0,
    `getTiprackVolume expected tip volume to be at least 0, got ${volume}`
  )
  return volume
}

export function getLabwareHasQuirk(
  labwareDef: LabwareDefinition2,
  quirk: string
): boolean {
  const quirks = labwareDef.parameters.quirks
  return quirks ? quirks.includes(quirk) : false
}

export const intToAlphabetLetter = (
  i: number,
  lowerCase: boolean = false
): string => String.fromCharCode((lowerCase ? 96 : 65) + i)
// These utils are great candidates for unit tests
export const toWellName = ({
  rowNum,
  colNum,
}: {
  rowNum: number
  colNum: number
}): string => String.fromCharCode(rowNum + 65) + (colNum + 1)

function _parseWell(well: string): [string, number] {
  const res = well.match(/([A-Z]+)(\d+)/)
  const letters = res && res[1]
  const number = res && parseInt(res[2])

  if (!letters || number == null || Number.isNaN(number)) {
    console.warn(
      `Could not parse well ${well}. Got letters: "${
        letters || 'void'
      }", number: "${number || 'void'}"`
    )
    return ['', NaN]
  }

  return [letters, number]
}

/** A compareFunction for sorting an array of well names
 * Goes down the columns (A1 to H1 on 96 plate)
 * Then L to R across rows (1 to 12 on 96 plate)
 */
export function sortWells(a: string, b: string): number {
  const [letterA, numberA] = _parseWell(a)

  const [letterB, numberB] = _parseWell(b)

  if (numberA !== numberB) {
    return numberA > numberB ? 1 : -1
  }

  if (letterA.length !== letterB.length) {
    // Eg 'B' vs 'AA'
    return letterA.length > letterB.length ? 1 : -1
  }

  return letterA > letterB ? 1 : -1
}

export function splitWellsOnColumn(sortedArray: string[]): string[][] {
  return sortedArray.reduce<string[][]>((acc, curr) => {
    const lastColumn = acc.slice(-1)

    if (lastColumn === undefined || lastColumn.length === 0) {
      return [[curr]]
    }

    const lastEle = lastColumn[0].slice(-1)[0].slice(1)

    if (Number(curr.slice(1)) > Number(lastEle)) {
      return [...acc, [curr]]
    } else {
      return [...acc.slice(0, -1), [...lastColumn[0], curr]]
    }
  }, [])
}

export const getWellDepth = (
  labwareDef: LabwareDefinition2,
  well: string
): number => labwareDef.wells[well].depth

// NOTE: this is used in PD for converting "offset from top" to "mm from bottom".
// Assumes all wells have same offset because multi-offset not yet supported.
// TODO: Ian 2019-07-13 return {[string: well]: offset} to support multi-offset
export const getWellsDepth = (
  labwareDef: LabwareDefinition2,
  wells: string[]
): number => {
  const offsets = wells.map(well => getWellDepth(labwareDef, well))

  if (uniq(offsets).length !== 1) {
    console.warn(
      `expected wells ${JSON.stringify(
        wells
      )} to all have same offset, but they were different. Labware def is ${getLabwareDefURI(
        labwareDef
      )}`
    )
  }

  return offsets[0]
}

export const getWellDimension = (
  labwareDef: LabwareDefinition2,
  wells: string[],
  position: 'x' | 'y'
): number => {
  const offsets = wells.map(well => {
    const labwareWell = labwareDef.wells[well]
    const shape = labwareWell.shape
    if (shape === 'circular') {
      return labwareWell.diameter
    } else {
      return position === 'x' ? labwareWell.xDimension : labwareWell.yDimension
    }
  })
  return offsets[0]
}

export const getSlotHasMatingSurfaceUnitVector = (
  deckDef: DeckDefinition,
  addressableAreaName: string
): boolean => {
  const matingSurfaceUnitVector = deckDef.locations.addressableAreas.find(
    aa => aa.id === addressableAreaName
  )?.matingSurfaceUnitVector

  return Boolean(matingSurfaceUnitVector)
}

export const getAreSlotsHorizontallyAdjacent = (
  slotNameA?: string | null,
  slotNameB?: string | null
): boolean => {
  if (slotNameA == null || slotNameB == null) {
    return false
  }
  const slotANumber = parseInt(slotNameA)
  const slotBNumber = parseInt(slotNameB)
  if (isNaN(slotBNumber) || isNaN(slotANumber)) {
    return false
  }
  const orderedSlots = standardOt2DeckDef.locations.cutouts
  // intentionally not substracting by 1 because trash (slot 12) should not count
  const numSlots = orderedSlots.length
  if (slotBNumber > numSlots || slotANumber > numSlots) {
    return false
  }
  const slotWidth = orderedSlots[1].position[0] - orderedSlots[0].position[0]
  const slotAPosition = orderedSlots[slotANumber - 1].position
  const slotBPosition = orderedSlots[slotBNumber - 1].position

  const yPositionSlotA = slotAPosition[1]
  const yPositionSlotB = slotBPosition[1]

  const xPositionSlotA = slotAPosition[0]
  const xPositionSlotB = slotBPosition[0]

  const areSlotsHorizontallyAdjacent =
    yPositionSlotA === yPositionSlotB &&
    Math.abs(xPositionSlotA - xPositionSlotB) === slotWidth

  return areSlotsHorizontallyAdjacent
}
export const getAreSlotsVerticallyAdjacent = (
  slotNameA?: string | null,
  slotNameB?: string | null
): boolean => {
  if (slotNameA == null || slotNameB == null) {
    return false
  }
  const slotANumber = parseInt(slotNameA)
  const slotBNumber = parseInt(slotNameB)

  if (isNaN(slotBNumber) || isNaN(slotANumber)) {
    return false
  }
  const orderedSlots = standardOt2DeckDef.locations.cutouts
  // intentionally not substracting by 1 because trash (slot 12) should not count
  const numSlots = orderedSlots.length

  if (slotBNumber > numSlots || slotANumber > numSlots) {
    return false
  }
  // take the y coord of slot 4, and subtact from y coord of slot 1
  const slotHeight = orderedSlots[3].position[1] - orderedSlots[0].position[1]
  const slotAPosition = orderedSlots[slotANumber - 1].position
  const slotBPosition = orderedSlots[slotBNumber - 1].position

  const yPositionSlotA = slotAPosition[1]
  const yPositionSlotB = slotBPosition[1]

  const xPositionSlotA = slotAPosition[0]
  const xPositionSlotB = slotBPosition[0]

  const areSlotsVerticallyAdjacent =
    xPositionSlotA === xPositionSlotB &&
    Math.abs(yPositionSlotA - yPositionSlotB) === slotHeight

  return areSlotsVerticallyAdjacent
}
//  TODO(jr, 11/12/23): rename this utility to mention that it
//  is only used in the OT-2, same with getAreSlotsHorizontallyAdjacent
//  and getAreSlotsVerticallyAdjacent
export const getAreSlotsAdjacent = (
  slotNameA?: string | null,
  slotNameB?: string | null
): boolean =>
  getAreSlotsHorizontallyAdjacent(slotNameA, slotNameB) ||
  getAreSlotsVerticallyAdjacent(slotNameA, slotNameB)

export const getIsLabwareAboveHeight = (
  labwareDef: LabwareDefinition2,
  height: number
): boolean => labwareDef.dimensions.zDimension > height

export const getAdapterName = (labwareLoadname: string): ThermalAdapterName => {
  let adapterName: ThermalAdapterName = 'Universal Flat Adapter'

  if (
    labwareLoadname ===
    'opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt'
  ) {
    adapterName = 'PCR Adapter'
  } else if (
    labwareLoadname === 'opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep'
  ) {
    adapterName = 'Deep Well Adapter'
  } else if (
    labwareLoadname ===
    'opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat'
  ) {
    adapterName = '96 Flat Bottom Adapter'
  }

  return adapterName
}

export const getCalibrationAdapterLoadName = (
  moduleModel: ModuleModel
): string | null => {
  switch (moduleModel) {
    case 'heaterShakerModuleV1':
      return 'opentrons_calibration_adapter_heatershaker_module'
    case 'temperatureModuleV2':
      return 'opentrons_calibration_adapter_temperature_module'
    case 'thermocyclerModuleV2':
      return 'opentrons_calibration_adapter_thermocycler_module'
    default:
      console.error(
        `${moduleModel} does not have an associated calibration adapter`
      )
      return null
  }
}

export const getDeckDefFromRobotType = (
  robotType: RobotType
): DeckDefinition => {
  // @ts-expect-error imported JSON not playing nice with TS. see https://github.com/microsoft/TypeScript/issues/32063
  return robotType === 'OT-3 Standard'
    ? standardFlexDeckDef
    : standardOt2DeckDef
}

export const getCutoutIdFromAddressableArea = (
  addressableAreaName: string,
  deckDefinition: DeckDefinition
): CutoutId | null => {
  /**
   * Given an addressable area name, returns the cutout ID associated with it, or null if there is none
   */

  for (const cutoutFixture of deckDefinition.cutoutFixtures) {
    for (const [cutoutId, providedAreas] of Object.entries(
      cutoutFixture.providesAddressableAreas
    ) as Array<[CutoutId, AddressableAreaName[]]>) {
      if (providedAreas.includes(addressableAreaName as AddressableAreaName)) {
        return cutoutId
      }
    }
  }

  console.error(
    `${addressableAreaName} is not provided by any cutout fixtures in deck definition ${deckDefinition.otId}`
  )

  return null
}
