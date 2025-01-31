import {
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_V1,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  ABSORBANCE_READER_TYPE,
  MAGNETIC_BLOCK_TYPE,
} from '@opentrons/shared-data'

import type { ModuleType, ModuleModel } from '@opentrons/shared-data'
import type {
  MagneticModuleState,
  TemperatureModuleState,
  ThermocyclerModuleState,
  HeaterShakerModuleState,
  ModuleState,
  AbsorbanceReaderState,
  MagneticBlockState,
} from './types'

// Temperature statuses
export const TEMPERATURE_DEACTIVATED: 'TEMPERATURE_DEACTIVATED' =
  'TEMPERATURE_DEACTIVATED'
export const TEMPERATURE_AT_TARGET: 'TEMPERATURE_AT_TARGET' =
  'TEMPERATURE_AT_TARGET'
export const TEMPERATURE_APPROACHING_TARGET: 'TEMPERATURE_APPROACHING_TARGET' =
  'TEMPERATURE_APPROACHING_TARGET'
export const AIR_GAP_OFFSET_FROM_TOP = 1
export const MODULES_WITH_COLLISION_ISSUES: ModuleModel[] = [
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_V1,
]
export const FIXED_TRASH_ID: 'fixedTrash' = 'fixedTrash'

export const MAGNETIC_MODULE_INITIAL_STATE: MagneticModuleState = {
  type: MAGNETIC_MODULE_TYPE,
  engaged: false,
}
export const TEMPERATURE_MODULE_INITIAL_STATE: TemperatureModuleState = {
  type: TEMPERATURE_MODULE_TYPE,
  status: TEMPERATURE_DEACTIVATED,
  targetTemperature: null,
}
export const THERMOCYCLER_MODULE_INITIAL_STATE: ThermocyclerModuleState = {
  type: THERMOCYCLER_MODULE_TYPE,
  blockTargetTemp: null,
  lidTargetTemp: null,
  lidOpen: null,
}
export const HEATERSHAKER_MODULE_INITIAL_STATE: HeaterShakerModuleState = {
  type: HEATERSHAKER_MODULE_TYPE,
  targetTemp: null,
  targetSpeed: null,
  latchOpen: null,
}

const ABSORBANCE_READER_INITIAL_STATE: AbsorbanceReaderState = {
  type: 'absorbanceReaderType',
  lidOpen: null,
}
const MAGNETIC_BLOCK_INITIAL_STATE: MagneticBlockState = {
  type: 'magneticBlockType',
}

export const MODULE_INITIAL_STATE_BY_TYPE: {
  [moduleType in ModuleType]: ModuleState
} = {
  [MAGNETIC_MODULE_TYPE]: MAGNETIC_MODULE_INITIAL_STATE,
  [TEMPERATURE_MODULE_TYPE]: TEMPERATURE_MODULE_INITIAL_STATE,
  [THERMOCYCLER_MODULE_TYPE]: THERMOCYCLER_MODULE_INITIAL_STATE,
  [HEATERSHAKER_MODULE_TYPE]: HEATERSHAKER_MODULE_INITIAL_STATE,
  //  TODO(jr, 6/24/24): add the initial state for absorabance reader
  [ABSORBANCE_READER_TYPE]: ABSORBANCE_READER_INITIAL_STATE,
  [MAGNETIC_BLOCK_TYPE]: MAGNETIC_BLOCK_INITIAL_STATE,
}
export const OT_2_TRASH_DEF_URI = 'opentrons/opentrons_1_trash_1100ml_fixed/1'
export const FLEX_TRASH_DEF_URI = 'opentrons/opentrons_1_trash_3200ml_fixed/1'
export const COLUMN_4_SLOTS = ['A4', 'B4', 'C4', 'D4']
