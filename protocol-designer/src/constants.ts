import mapValues from 'lodash/mapValues'
import {
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'
import type {
  CutoutId,
  DeckSlot as DeckDefSlot,
  LabwareDefinition2,
  ModuleModel,
  ModuleType,
} from '@opentrons/shared-data'
import type { DeckSlot, WellVolumes } from './types'

export const getMaxVolumes = (def: LabwareDefinition2): WellVolumes =>
  mapValues(def.wells, well => well.totalLiquidVolume)

/** All wells for labware, in arbitrary order. */
export function getAllWellsForLabware(def: LabwareDefinition2): string[] {
  return Object.keys(def.wells)
}
export const FIXED_TRASH_ID: 'fixedTrash' = 'fixedTrash'
// Standard slot dims FOR VISUALIZATION ONLY
export const STD_SLOT_X_DIM = 128
export const STD_SLOT_Y_DIM = 86
export const STD_SLOT_DIVIDER_WIDTH = 4
// PD-specific slots that don't exist in deck definition.
// These have no visual representation on the deck themselves,
// but may contain certain specific items that span (eg thermocycler)
export const SPAN7_8_10_11_SLOT: 'span7_8_10_11' = 'span7_8_10_11'
export const TC_SPAN_SLOTS: DeckSlot[] = ['7', '8', '10', '11']
export const PSEUDO_DECK_SLOTS: Record<DeckSlot, DeckDefSlot> = {
  [SPAN7_8_10_11_SLOT]: {
    displayName: 'Spanning slot',
    id: SPAN7_8_10_11_SLOT,
    position: [0.0, 181.0, 0.0],
    // shares origin with OT2 standard slot 7
    matingSurfaceUnitVector: [-1, 1, -1],
    boundingBox: {
      xDimension: STD_SLOT_X_DIM * 2 + STD_SLOT_DIVIDER_WIDTH,
      yDimension: STD_SLOT_Y_DIM * 2 + STD_SLOT_DIVIDER_WIDTH,
      zDimension: 0,
    },
    compatibleModules: [THERMOCYCLER_MODULE_TYPE],
  },
}
export const START_TERMINAL_TITLE = 'STARTING DECK STATE'
export const END_TERMINAL_TITLE = 'FINAL DECK STATE'
// special ID for invisible deck setup step-form
export const INITIAL_DECK_SETUP_STEP_ID = '__INITIAL_DECK_SETUP_STEP__'
export const DEFAULT_CHANGE_TIP_OPTION: 'always' = 'always'
// TODO: Ian 2019-06-13 don't keep these as hard-coded static values (see #3587)
export const DEFAULT_MM_FROM_BOTTOM_ASPIRATE = 1
export const DEFAULT_MM_FROM_BOTTOM_DISPENSE = 1
// NOTE: in the negative Z direction, to go down from top
export const DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP = -1
export const DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP = 0
export const DEFAULT_DELAY_SECONDS = 1
export const DEFAULT_WELL_ORDER_FIRST_OPTION: 't2b' = 't2b'
export const DEFAULT_WELL_ORDER_SECOND_OPTION: 'l2r' = 'l2r'
export const MIN_ENGAGE_HEIGHT_V1 = 0
export const MAX_ENGAGE_HEIGHT_V1 = 45
export const MIN_ENGAGE_HEIGHT_V2 = -2.5
export const MAX_ENGAGE_HEIGHT_V2 = 25
export const MIN_TEMP_MODULE_TEMP = 4
export const MAX_TEMP_MODULE_TEMP = 95
export const MIN_HEATER_SHAKER_MODULE_TEMP = 37
export const MAX_HEATER_SHAKER_MODULE_TEMP = 95
export const MIN_HEATER_SHAKER_MODULE_RPM = 200
export const MAX_HEATER_SHAKER_MODULE_RPM = 3000
export const MIN_HEATER_SHAKER_DURATION_SECONDS = 0
export const MAX_HEATER_SHAKER_DURATION_SECONDS = 60
export const MIN_TC_BLOCK_TEMP = 4
export const MAX_TC_BLOCK_TEMP = 99
export const MIN_TC_LID_TEMP = 37
export const MAX_TC_LID_TEMP = 110
export const MIN_TC_DURATION_SECONDS = 0
export const MAX_TC_DURATION_SECONDS = 60
export const MIN_TC_PROFILE_VOLUME = 0
export const MAX_TC_PROFILE_VOLUME = 100
export const MODELS_FOR_MODULE_TYPE: Record<
  ModuleType,
  Array<{
    name: string
    value: ModuleModel
    disabled?: boolean
  }>
> = {
  [MAGNETIC_MODULE_TYPE]: [
    {
      name: 'GEN1',
      value: MAGNETIC_MODULE_V1,
    },
    {
      name: 'GEN2',
      value: MAGNETIC_MODULE_V2,
    },
  ],
  [TEMPERATURE_MODULE_TYPE]: [
    {
      name: 'GEN1',
      value: TEMPERATURE_MODULE_V1,
    },
    {
      name: 'GEN2',
      value: TEMPERATURE_MODULE_V2,
    },
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    {
      name: 'GEN1',
      value: THERMOCYCLER_MODULE_V1,
    },
    {
      name: 'GEN2',
      value: THERMOCYCLER_MODULE_V2,
    },
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    {
      name: 'GEN1',
      value: HEATERSHAKER_MODULE_V1,
    },
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    {
      name: 'GEN1',
      value: MAGNETIC_BLOCK_V1,
    },
  ],
  [ABSORBANCE_READER_TYPE]: [
    {
      name: 'GEN1',
      value: ABSORBANCE_READER_V1,
    },
  ],
}

export const DEFAULT_MODEL_FOR_MODULE_TYPE: Record<ModuleType, ModuleModel> = {
  [MAGNETIC_MODULE_TYPE]: MAGNETIC_MODULE_V2,
  [TEMPERATURE_MODULE_TYPE]: TEMPERATURE_MODULE_V2,
  [THERMOCYCLER_MODULE_TYPE]: THERMOCYCLER_MODULE_V2,
  [HEATERSHAKER_MODULE_TYPE]: HEATERSHAKER_MODULE_V1,
  [MAGNETIC_BLOCK_TYPE]: MAGNETIC_BLOCK_V1,
  [ABSORBANCE_READER_TYPE]: ABSORBANCE_READER_V1,
}
// Values for pauseAction field
export const PAUSE_UNTIL_RESUME: 'untilResume' = 'untilResume'
export const PAUSE_UNTIL_TIME: 'untilTime' = 'untilTime'
export const PAUSE_UNTIL_TEMP: 'untilTemperature' = 'untilTemperature'
export const DND_TYPES = {
  LABWARE: 'LABWARE',
  STEP_ITEM: 'STEP_ITEM',
}
// Values for TC fields
export const THERMOCYCLER_STATE: 'thermocyclerState' = 'thermocyclerState'
export const THERMOCYCLER_PROFILE: 'thermocyclerProfile' = 'thermocyclerProfile'
// Priority for fixtures
export const STAGING_AREA_CUTOUTS_ORDERED: CutoutId[] = [
  'cutoutB3',
  'cutoutC3',
  'cutoutD3',
  'cutoutA3',
]
