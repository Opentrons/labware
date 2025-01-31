import {
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_V2,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
} from '@opentrons/shared-data'

import type { ModuleModel, ModuleType } from '@opentrons/shared-data'

export const FLEX_MODULE_MODELS: ModuleModel[] = [
  'absorbanceReaderV1',
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_V2,
]
export const OT2_MODULE_MODELS: ModuleModel[] = [
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_V2,
  THERMOCYCLER_MODULE_V1,
]

export type Fixture =
  | 'stagingArea'
  | 'trashBin'
  | 'wasteChute'
  | 'wasteChuteAndStagingArea'

export const FIXTURES: Fixture[] = [
  'stagingArea',
  'trashBin',
  'wasteChute',
  'wasteChuteAndStagingArea',
]

//  labware categories
export const ORDERED_CATEGORIES: string[] = [
  'tipRack',
  'tubeRack',
  'wellPlate',
  'reservoir',
  'aluminumBlock',
  'adapter',
]
export const CUSTOM_CATEGORY = 'custom'
export const ALL_ORDERED_CATEGORIES = [CUSTOM_CATEGORY, ...ORDERED_CATEGORIES]

export const RECOMMENDED_LABWARE_BY_MODULE: { [K in ModuleType]: string[] } = {
  [TEMPERATURE_MODULE_TYPE]: [
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_96_well_aluminum_block',
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_aluminum_flat_bottom_plate',
    'opentrons_96_deep_well_temp_mod_adapter',
  ],
  [MAGNETIC_MODULE_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    'opentrons_96_deep_well_adapter',
    'opentrons_96_flat_bottom_adapter',
    'opentrons_96_pcr_adapter',
    'opentrons_universal_flat_adapter',
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [ABSORBANCE_READER_TYPE]: ['nest_96_wellplate_200ul_flat'],
}

export const MOAM_MODELS_WITH_FF: ModuleModel[] = [TEMPERATURE_MODULE_V2]
export const MOAM_MODELS: ModuleModel[] = [
  TEMPERATURE_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  ABSORBANCE_READER_V1,
]

export const MAX_MOAM_MODULES = 7
//  limiting 10 instead of 11 to make space for a single default tiprack
//  to be auto-generated
export const MAX_MAGNETIC_BLOCKS = 10
