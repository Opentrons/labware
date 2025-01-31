import type { CutoutFixtureId, CutoutId, AddressableAreaName } from '../deck'
import type { ModuleModel, ModuleType } from './types'

// constants for dealing with robot coordinate system (eg in labwareTools)
export const SLOT_LENGTH_MM = 127.76 // along X axis in robot coordinate system

export const SLOT_WIDTH_MM = 85.48 // along Y axis in robot coordinate system

// constants for SVG renders of the deck
export const SLOT_RENDER_WIDTH = SLOT_LENGTH_MM // along X axis in SVG coords

export const SLOT_RENDER_HEIGHT = SLOT_WIDTH_MM // along Y axis in SVG coords

// taken from opentrons_1_trash_1100ml_fixed v1's dimensions
export const FIXED_TRASH_RENDER_HEIGHT = 165.86 // along Y axis in SVG coords

// used for module visualization, remove this when we start using actual module dimensions
export const STD_SLOT_X_DIM = 128
export const STD_SLOT_Y_DIM = 86
export const STD_SLOT_DIVIDER_WIDTH = 4

export const OPENTRONS_LABWARE_NAMESPACE = 'opentrons'
export const FIXED_TRASH_ID = 'fixedTrash'

// TODO: IL 2020-02-19 These 3 constants are DEPRECATED because they're ambiguous model vs type.
export const THERMOCYCLER: 'thermocycler' = 'thermocycler'
export const TEMPDECK: 'tempdeck' = 'tempdeck'
export const MAGDECK: 'magdeck' = 'magdeck'

// these are the Module Def Schema v2 equivalents of the above. They should match the names of JSON definitions
// in shared-data/module/definitions/2.
export const MAGNETIC_MODULE_V1: 'magneticModuleV1' = 'magneticModuleV1'
export const MAGNETIC_MODULE_V2: 'magneticModuleV2' = 'magneticModuleV2'
export const TEMPERATURE_MODULE_V1: 'temperatureModuleV1' =
  'temperatureModuleV1'
export const TEMPERATURE_MODULE_V2: 'temperatureModuleV2' =
  'temperatureModuleV2'
export const THERMOCYCLER_MODULE_V1: 'thermocyclerModuleV1' =
  'thermocyclerModuleV1'
export const THERMOCYCLER_MODULE_V2: 'thermocyclerModuleV2' =
  'thermocyclerModuleV2'
export const HEATERSHAKER_MODULE_V1: 'heaterShakerModuleV1' =
  'heaterShakerModuleV1'
export const ABSORBANCE_READER_V1: 'absorbanceReaderV1' = 'absorbanceReaderV1'

export const MAGNETIC_BLOCK_V1: 'magneticBlockV1' = 'magneticBlockV1'

export const GRIPPER_V1: 'gripperV1' = 'gripperV1'
export const GRIPPER_V1_1: 'gripperV1.1' = 'gripperV1.1'
export const GRIPPER_V1_2: 'gripperV1.2' = 'gripperV1.2'
export const GRIPPER_V1_3: 'gripperV1.3' = 'gripperV1.3'
export const GRIPPER_MODELS = [
  GRIPPER_V1,
  GRIPPER_V1_1,
  GRIPPER_V1_2,
  GRIPPER_V1_3,
]

// robot display name
export const OT2_DISPLAY_NAME: 'Opentrons OT-2' = 'Opentrons OT-2'
export const FLEX_DISPLAY_NAME: 'Opentrons Flex' = 'Opentrons Flex'

// pipette display categories
export const FLEX: 'FLEX' = 'FLEX'
export const GEN2: 'GEN2' = 'GEN2'
export const GEN1: 'GEN1' = 'GEN1'

// pipette mounts
export const LEFT: 'left' = 'left'
export const RIGHT: 'right' = 'right'
export const EXTENSION: 'extension' = 'extension'

// fake slot that PD uses to represent the slot the thermocycler sits in
export const SPAN7_8_10_11_SLOT: 'span7_8_10_11' = 'span7_8_10_11'

// NOTE: these are NOT module MODELs, they are `moduleType`s. Should match ENUM in module definition file.
export const TEMPERATURE_MODULE_TYPE: 'temperatureModuleType' =
  'temperatureModuleType'
export const MAGNETIC_MODULE_TYPE: 'magneticModuleType' = 'magneticModuleType'
export const THERMOCYCLER_MODULE_TYPE: 'thermocyclerModuleType' =
  'thermocyclerModuleType'
export const HEATERSHAKER_MODULE_TYPE: 'heaterShakerModuleType' =
  'heaterShakerModuleType'
export const MAGNETIC_BLOCK_TYPE: 'magneticBlockType' = 'magneticBlockType'
export const ABSORBANCE_READER_TYPE: 'absorbanceReaderType' =
  'absorbanceReaderType'

export const MAGNETIC_MODULE_MODELS = [MAGNETIC_MODULE_V1, MAGNETIC_MODULE_V2]

export const NON_CONNECTING_MODULE_TYPES: ModuleType[] = [MAGNETIC_BLOCK_TYPE]

export const TEMPERATURE_MODULE_MODELS = [
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
]

export const THERMOCYCLER_MODULE_MODELS = [
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
]

export const HEATERSHAKER_MODULE_MODELS = [HEATERSHAKER_MODULE_V1]

export const ABSORBANCE_READER_MODELS = [ABSORBANCE_READER_V1]

export const MAGNETIC_BLOCK_MODELS = [MAGNETIC_BLOCK_V1]

export const MODULE_MODELS = [
  ...MAGNETIC_MODULE_MODELS,
  ...TEMPERATURE_MODULE_MODELS,
  ...THERMOCYCLER_MODULE_MODELS,
  ...HEATERSHAKER_MODULE_MODELS,
  ...MAGNETIC_BLOCK_MODELS,
  ...ABSORBANCE_READER_MODELS,
]

export const MODULE_MODELS_OT2_ONLY = [
  ...MAGNETIC_MODULE_MODELS,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_V1,
]

export const MODULE_TYPES = [
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
]

export const GEN_ONE_MULTI_PIPETTES = ['p10_multi', 'p50_multi', 'p300_multi']

export const IDENTITY_VECTOR = { x: 0, y: 0, z: 0 }

export const ROBOT_MODELS = ['OT-2 Standard', 'OT-3 Standard']
export const OT2_ROBOT_TYPE = 'OT-2 Standard' as const
export const FLEX_ROBOT_TYPE = 'OT-3 Standard' as const

//  TODO(jr, 7/13/23): rename this constant to FLEX_PIPETTES
export const OT3_PIPETTES = [
  'p300_single_flex',
  'p1000_single_flex',
  'p20_single_flex',
  'p50_single_flex',
  'p50_multi_flex',
  'p1000_multi_flex',
  'p1000_multi_em_flex',
  'p1000_96',
  'p200_96',
]
export const OT2_PIPETTES = [
  'p300_single',
  'p300_multi',
  'p300_single_gen2',
  'p300_multi_gen2',
  'p1000_single',
  'p1000_single_gen2',
  'p20_single_gen2',
  'p20_multi_gen2',
  'p50_single',
  'p50_multi',
  'p10_single',
  'p10_multi',
]

//  magnetic module info
export const MM: 'mm' = 'mm'
export const MAGNETIC_MODULES_MAX_ENGAGE_HEIGHT = 20
export const MAGNETIC_MODULE_V2_DISNEGAGED_HEIGHT = -2.5 //  TODO(jr, 6/14/22): change this to -4 when ticket #9585 merges
export const MAGNETIC_MODULE_V1_DISNEGAGED_HEIGHT = -2.5

export const MAGNETIC_MODULE_TYPE_LABWARE_BOTTOM_HEIGHT = 0

export const CELSIUS: '°C' = '°C'
export const TEMP_MIN = 4
export const TEMP_MAX = 96
export const TEMP_BLOCK_MAX = 99
export const TEMP_LID_MIN = 37
export const TEMP_LID_MAX = 110
export const HS_TEMP_MIN = 37
export const HS_TEMP_MAX = 95
export const MICRO_LITERS = 'µL'

// Heater shaker module info
export const RPM: 'RPM' = 'RPM'
export const HS_RPM_MIN = 200
export const HS_RPM_MAX = 3000
export const TOO_HOT_TEMP = 48.9
export const MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM = 53

export const OT2_STANDARD_MODEL: 'OT-2 Standard' = 'OT-2 Standard'
export const OT2_STANDARD_DECKID: 'ot2_standard' = 'ot2_standard'
export const FLEX_STANDARD_MODEL: 'OT-3 Standard' = 'OT-3 Standard'
export const FLEX_STANDARD_DECKID: 'ot3_standard' = 'ot3_standard'

export const SINGLE_CHANNEL: 'Single-Channel' = 'Single-Channel'
export const EIGHT_CHANNEL: '8-Channel' = '8-Channel'
export const NINETY_SIX_CHANNEL: '96-Channel' = '96-Channel'
export const SINGLE_MOUNT_PIPETTES: 'Single-Channel_and_8-Channel' =
  'Single-Channel_and_8-Channel'

// Thermocycler module info
export const TC_MODULE_LOCATION_OT2: '7,8,10,11' = '7,8,10,11'
export const TC_MODULE_LOCATION_OT3: 'A1+B1' = 'A1+B1'

export const WEIGHT_OF_96_CHANNEL: '~10kg' = '~10kg'

export const MOVABLE_TRASH_CUTOUTS: CutoutId[] = [
  'cutoutA1',
  'cutoutB1',
  'cutoutC1',
  'cutoutD1',
  'cutoutA3',
  'cutoutB3',
  'cutoutC3',
  'cutoutD3',
]

export const SINGLE_LEFT_CUTOUTS: CutoutId[] = [
  'cutoutA1',
  'cutoutB1',
  'cutoutC1',
  'cutoutD1',
]

export const SINGLE_CENTER_CUTOUTS: CutoutId[] = [
  'cutoutA2',
  'cutoutB2',
  'cutoutC2',
  'cutoutD2',
]

export const SINGLE_RIGHT_CUTOUTS: CutoutId[] = [
  'cutoutA3',
  'cutoutB3',
  'cutoutC3',
  'cutoutD3',
]

export const STAGING_AREA_CUTOUTS: CutoutId[] = [
  'cutoutA3',
  'cutoutB3',
  'cutoutC3',
  'cutoutD3',
]

export const TEMPERATURE_MODULE_CUTOUTS: CutoutId[] = [
  ...SINGLE_RIGHT_CUTOUTS,
  ...SINGLE_LEFT_CUTOUTS,
]
export const HEATER_SHAKER_CUTOUTS: CutoutId[] = [
  ...SINGLE_RIGHT_CUTOUTS,
  ...SINGLE_LEFT_CUTOUTS,
]
export const THERMOCYCLER_MODULE_CUTOUTS: CutoutId[] = ['cutoutA1', 'cutoutB1']
export const ABSORBANCE_READER_CUTOUTS: CutoutId[] = [
  'cutoutA3',
  'cutoutB3',
  'cutoutC3',
  'cutoutD3',
]

export const WASTE_CHUTE_CUTOUT: 'cutoutD3' = 'cutoutD3'

export const A1_ADDRESSABLE_AREA: 'A1' = 'A1'
export const A2_ADDRESSABLE_AREA: 'A2' = 'A2'
export const A3_ADDRESSABLE_AREA: 'A3' = 'A3'
export const A4_ADDRESSABLE_AREA: 'A4' = 'A4'
export const B1_ADDRESSABLE_AREA: 'B1' = 'B1'
export const B2_ADDRESSABLE_AREA: 'B2' = 'B2'
export const B3_ADDRESSABLE_AREA: 'B3' = 'B3'
export const B4_ADDRESSABLE_AREA: 'B4' = 'B4'
export const C1_ADDRESSABLE_AREA: 'C1' = 'C1'
export const C2_ADDRESSABLE_AREA: 'C2' = 'C2'
export const C3_ADDRESSABLE_AREA: 'C3' = 'C3'
export const C4_ADDRESSABLE_AREA: 'C4' = 'C4'
export const D1_ADDRESSABLE_AREA: 'D1' = 'D1'
export const D2_ADDRESSABLE_AREA: 'D2' = 'D2'
export const D3_ADDRESSABLE_AREA: 'D3' = 'D3'
export const D4_ADDRESSABLE_AREA: 'D4' = 'D4'

export const MOVABLE_TRASH_A1_ADDRESSABLE_AREA: 'movableTrashA1' =
  'movableTrashA1'
export const MOVABLE_TRASH_A3_ADDRESSABLE_AREA: 'movableTrashA3' =
  'movableTrashA3'
export const MOVABLE_TRASH_B1_ADDRESSABLE_AREA: 'movableTrashB1' =
  'movableTrashB1'
export const MOVABLE_TRASH_B3_ADDRESSABLE_AREA: 'movableTrashB3' =
  'movableTrashB3'
export const MOVABLE_TRASH_C1_ADDRESSABLE_AREA: 'movableTrashC1' =
  'movableTrashC1'
export const MOVABLE_TRASH_C3_ADDRESSABLE_AREA: 'movableTrashC3' =
  'movableTrashC3'
export const MOVABLE_TRASH_D1_ADDRESSABLE_AREA: 'movableTrashD1' =
  'movableTrashD1'
export const MOVABLE_TRASH_D3_ADDRESSABLE_AREA: 'movableTrashD3' =
  'movableTrashD3'

export const ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA: '1ChannelWasteChute' =
  '1ChannelWasteChute'
export const EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA: '8ChannelWasteChute' =
  '8ChannelWasteChute'
export const NINETY_SIX_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA: '96ChannelWasteChute' =
  '96ChannelWasteChute'
export const GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA: 'gripperWasteChute' =
  'gripperWasteChute'

export const THERMOCYCLER_ADDRESSABLE_AREA: 'thermocyclerModuleV2' =
  'thermocyclerModuleV2'
export const HEATERSHAKER_A1_ADDRESSABLE_AREA: 'heaterShakerV1A1' =
  'heaterShakerV1A1'
export const HEATERSHAKER_B1_ADDRESSABLE_AREA: 'heaterShakerV1B1' =
  'heaterShakerV1B1'
export const HEATERSHAKER_C1_ADDRESSABLE_AREA: 'heaterShakerV1C1' =
  'heaterShakerV1C1'
export const HEATERSHAKER_D1_ADDRESSABLE_AREA: 'heaterShakerV1D1' =
  'heaterShakerV1D1'
export const HEATERSHAKER_A3_ADDRESSABLE_AREA: 'heaterShakerV1A3' =
  'heaterShakerV1A3'
export const HEATERSHAKER_B3_ADDRESSABLE_AREA: 'heaterShakerV1B3' =
  'heaterShakerV1B3'
export const HEATERSHAKER_C3_ADDRESSABLE_AREA: 'heaterShakerV1C3' =
  'heaterShakerV1C3'
export const HEATERSHAKER_D3_ADDRESSABLE_AREA: 'heaterShakerV1D3' =
  'heaterShakerV1D3'
export const TEMPERATURE_MODULE_A1_ADDRESSABLE_AREA: 'temperatureModuleV2A1' =
  'temperatureModuleV2A1'
export const TEMPERATURE_MODULE_B1_ADDRESSABLE_AREA: 'temperatureModuleV2B1' =
  'temperatureModuleV2B1'
export const TEMPERATURE_MODULE_C1_ADDRESSABLE_AREA: 'temperatureModuleV2C1' =
  'temperatureModuleV2C1'
export const TEMPERATURE_MODULE_D1_ADDRESSABLE_AREA: 'temperatureModuleV2D1' =
  'temperatureModuleV2D1'
export const TEMPERATURE_MODULE_A3_ADDRESSABLE_AREA: 'temperatureModuleV2A3' =
  'temperatureModuleV2A3'
export const TEMPERATURE_MODULE_B3_ADDRESSABLE_AREA: 'temperatureModuleV2B3' =
  'temperatureModuleV2B3'
export const TEMPERATURE_MODULE_C3_ADDRESSABLE_AREA: 'temperatureModuleV2C3' =
  'temperatureModuleV2C3'
export const TEMPERATURE_MODULE_D3_ADDRESSABLE_AREA: 'temperatureModuleV2D3' =
  'temperatureModuleV2D3'

export const MAGNETIC_BLOCK_A1_ADDRESSABLE_AREA: 'magneticBlockV1A1' =
  'magneticBlockV1A1'
export const MAGNETIC_BLOCK_B1_ADDRESSABLE_AREA: 'magneticBlockV1B1' =
  'magneticBlockV1B1'
export const MAGNETIC_BLOCK_C1_ADDRESSABLE_AREA: 'magneticBlockV1C1' =
  'magneticBlockV1C1'
export const MAGNETIC_BLOCK_D1_ADDRESSABLE_AREA: 'magneticBlockV1D1' =
  'magneticBlockV1D1'
export const MAGNETIC_BLOCK_A2_ADDRESSABLE_AREA: 'magneticBlockV1A2' =
  'magneticBlockV1A2'
export const MAGNETIC_BLOCK_B2_ADDRESSABLE_AREA: 'magneticBlockV1B2' =
  'magneticBlockV1B2'
export const MAGNETIC_BLOCK_C2_ADDRESSABLE_AREA: 'magneticBlockV1C2' =
  'magneticBlockV1C2'
export const MAGNETIC_BLOCK_D2_ADDRESSABLE_AREA: 'magneticBlockV1D2' =
  'magneticBlockV1D2'
export const MAGNETIC_BLOCK_A3_ADDRESSABLE_AREA: 'magneticBlockV1A3' =
  'magneticBlockV1A3'
export const MAGNETIC_BLOCK_B3_ADDRESSABLE_AREA: 'magneticBlockV1B3' =
  'magneticBlockV1B3'
export const MAGNETIC_BLOCK_C3_ADDRESSABLE_AREA: 'magneticBlockV1C3' =
  'magneticBlockV1C3'
export const MAGNETIC_BLOCK_D3_ADDRESSABLE_AREA: 'magneticBlockV1D3' =
  'magneticBlockV1D3'
export const ABSORBANCE_READER_D3_ADDRESSABLE_AREA: 'absorbanceReaderV1D3' =
  'absorbanceReaderV1D3'
export const ABSORBANCE_READER_C3_ADDRESSABLE_AREA: 'absorbanceReaderV1C3' =
  'absorbanceReaderV1C3'
export const ABSORBANCE_READER_B3_ADDRESSABLE_AREA: 'absorbanceReaderV1B3' =
  'absorbanceReaderV1B3'
export const ABSORBANCE_READER_A3_ADDRESSABLE_AREA: 'absorbanceReaderV1A3' =
  'absorbanceReaderV1A3'
export const ABSORBANCE_READER_LID_DOCK_A4_ADDRESSABLE_AREA: 'absorbanceReaderV1LidDockA4' =
  'absorbanceReaderV1LidDockA4'
export const ABSORBANCE_READER_LID_DOCK_B4_ADDRESSABLE_AREA: 'absorbanceReaderV1LidDockB4' =
  'absorbanceReaderV1LidDockB4'
export const ABSORBANCE_READER_LID_DOCK_C4_ADDRESSABLE_AREA: 'absorbanceReaderV1LidDockC4' =
  'absorbanceReaderV1LidDockC4'
export const ABSORBANCE_READER_LID_DOCK_D4_ADDRESSABLE_AREA: 'absorbanceReaderV1LidDockD4' =
  'absorbanceReaderV1LidDockD4'

export const MAGNETIC_BLOCK_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  MAGNETIC_BLOCK_A1_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_B1_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_C1_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_D1_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_A2_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_B2_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_C2_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_D2_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_A3_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_B3_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_C3_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_D3_ADDRESSABLE_AREA,
]

export const TEMPERATURE_MODULE_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  TEMPERATURE_MODULE_A1_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_B1_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_C1_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_D1_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_A3_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_B3_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_C3_ADDRESSABLE_AREA,
  TEMPERATURE_MODULE_D3_ADDRESSABLE_AREA,
]

export const HEATERSHAKER_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  HEATERSHAKER_A1_ADDRESSABLE_AREA,
  HEATERSHAKER_B1_ADDRESSABLE_AREA,
  HEATERSHAKER_C1_ADDRESSABLE_AREA,
  HEATERSHAKER_D1_ADDRESSABLE_AREA,
  HEATERSHAKER_A3_ADDRESSABLE_AREA,
  HEATERSHAKER_B3_ADDRESSABLE_AREA,
  HEATERSHAKER_C3_ADDRESSABLE_AREA,
  HEATERSHAKER_D3_ADDRESSABLE_AREA,
]

export const ABSORBANCE_READER_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  ABSORBANCE_READER_A3_ADDRESSABLE_AREA,
  ABSORBANCE_READER_B3_ADDRESSABLE_AREA,
  ABSORBANCE_READER_C3_ADDRESSABLE_AREA,
  ABSORBANCE_READER_D3_ADDRESSABLE_AREA,
  ABSORBANCE_READER_LID_DOCK_A4_ADDRESSABLE_AREA,
  ABSORBANCE_READER_LID_DOCK_B4_ADDRESSABLE_AREA,
  ABSORBANCE_READER_LID_DOCK_C4_ADDRESSABLE_AREA,
  ABSORBANCE_READER_LID_DOCK_D4_ADDRESSABLE_AREA,
]

export const FLEX_USB_MODULE_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  THERMOCYCLER_ADDRESSABLE_AREA,
  ...ABSORBANCE_READER_ADDRESSABLE_AREAS,
  ...HEATERSHAKER_ADDRESSABLE_AREAS,
  ...TEMPERATURE_MODULE_ADDRESSABLE_AREAS,
]

export const FLEX_MODULE_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  ...FLEX_USB_MODULE_ADDRESSABLE_AREAS,
  ...MAGNETIC_BLOCK_ADDRESSABLE_AREAS,
]

export const ADDRESSABLE_AREA_1: '1' = '1'
export const ADDRESSABLE_AREA_2: '2' = '2'
export const ADDRESSABLE_AREA_3: '3' = '3'
export const ADDRESSABLE_AREA_4: '4' = '4'
export const ADDRESSABLE_AREA_5: '5' = '5'
export const ADDRESSABLE_AREA_6: '6' = '6'
export const ADDRESSABLE_AREA_7: '7' = '7'
export const ADDRESSABLE_AREA_8: '8' = '8'
export const ADDRESSABLE_AREA_9: '9' = '9'
export const ADDRESSABLE_AREA_10: '10' = '10'
export const ADDRESSABLE_AREA_11: '11' = '11'

export const OT2_SINGLE_SLOT_ADDRESSABLE_AREAS: AddressableAreaName[] = [
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

export const FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS: AddressableAreaName[] = [
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

export const FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  A4_ADDRESSABLE_AREA,
  B4_ADDRESSABLE_AREA,
  C4_ADDRESSABLE_AREA,
  D4_ADDRESSABLE_AREA,
]

export const MOVABLE_TRASH_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  MOVABLE_TRASH_A1_ADDRESSABLE_AREA,
  MOVABLE_TRASH_A3_ADDRESSABLE_AREA,
  MOVABLE_TRASH_B1_ADDRESSABLE_AREA,
  MOVABLE_TRASH_B3_ADDRESSABLE_AREA,
  MOVABLE_TRASH_C1_ADDRESSABLE_AREA,
  MOVABLE_TRASH_C3_ADDRESSABLE_AREA,
  MOVABLE_TRASH_D1_ADDRESSABLE_AREA,
  MOVABLE_TRASH_D3_ADDRESSABLE_AREA,
]

export const WASTE_CHUTE_ADDRESSABLE_AREAS: AddressableAreaName[] = [
  ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  NINETY_SIX_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
]

export const SINGLE_LEFT_SLOT_FIXTURE: 'singleLeftSlot' = 'singleLeftSlot'
export const SINGLE_CENTER_SLOT_FIXTURE: 'singleCenterSlot' = 'singleCenterSlot'
export const SINGLE_RIGHT_SLOT_FIXTURE: 'singleRightSlot' = 'singleRightSlot'

export const STAGING_AREA_RIGHT_SLOT_FIXTURE: 'stagingAreaRightSlot' =
  'stagingAreaRightSlot'

export const TRASH_BIN_FIXTURE: 'trashBin' = 'trashBin'
export const TRASH_BIN_ADAPTER_FIXTURE: 'trashBinAdapter' = 'trashBinAdapter'

export const WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE: 'wasteChuteRightAdapterCovered' =
  'wasteChuteRightAdapterCovered'
export const WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE: 'wasteChuteRightAdapterNoCover' =
  'wasteChuteRightAdapterNoCover'
export const STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE: 'stagingAreaSlotWithWasteChuteRightAdapterCovered' =
  'stagingAreaSlotWithWasteChuteRightAdapterCovered'
export const STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE: 'stagingAreaSlotWithWasteChuteRightAdapterNoCover' =
  'stagingAreaSlotWithWasteChuteRightAdapterNoCover'

export const HEATERSHAKER_MODULE_V1_FIXTURE: 'heaterShakerModuleV1' =
  'heaterShakerModuleV1'
export const TEMPERATURE_MODULE_V2_FIXTURE: 'temperatureModuleV2' =
  'temperatureModuleV2'
export const MAGNETIC_BLOCK_V1_FIXTURE: 'magneticBlockV1' = 'magneticBlockV1'
export const STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE: 'stagingAreaSlotWithMagneticBlockV1' =
  'stagingAreaSlotWithMagneticBlockV1'
export const THERMOCYCLER_V2_REAR_FIXTURE: 'thermocyclerModuleV2Rear' =
  'thermocyclerModuleV2Rear'
export const THERMOCYCLER_V2_FRONT_FIXTURE: 'thermocyclerModuleV2Front' =
  'thermocyclerModuleV2Front'
export const ABSORBANCE_READER_V1_FIXTURE: 'absorbanceReaderV1' =
  'absorbanceReaderV1'

export const MODULE_FIXTURES_BY_MODEL: {
  [moduleModel in ModuleModel]?: CutoutFixtureId[]
} = {
  [HEATERSHAKER_MODULE_V1]: [HEATERSHAKER_MODULE_V1_FIXTURE],
  [TEMPERATURE_MODULE_V2]: [TEMPERATURE_MODULE_V2_FIXTURE],
  [MAGNETIC_BLOCK_V1]: [MAGNETIC_BLOCK_V1_FIXTURE],
  [THERMOCYCLER_MODULE_V2]: [
    THERMOCYCLER_V2_REAR_FIXTURE,
    THERMOCYCLER_V2_FRONT_FIXTURE,
  ],
  [ABSORBANCE_READER_V1]: [ABSORBANCE_READER_V1_FIXTURE],
}

export const FLEX_USB_MODULE_FIXTURES: CutoutFixtureId[] = [
  HEATERSHAKER_MODULE_V1_FIXTURE,
  TEMPERATURE_MODULE_V2_FIXTURE,
  THERMOCYCLER_V2_REAR_FIXTURE,
  THERMOCYCLER_V2_FRONT_FIXTURE,
  ABSORBANCE_READER_V1_FIXTURE,
]

export const MAGNETIC_BLOCK_FIXTURES: CutoutFixtureId[] = [
  MAGNETIC_BLOCK_V1_FIXTURE,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
]

export const SINGLE_SLOT_FIXTURES: CutoutFixtureId[] = [
  SINGLE_LEFT_SLOT_FIXTURE,
  SINGLE_CENTER_SLOT_FIXTURE,
  SINGLE_RIGHT_SLOT_FIXTURE,
]

export const WASTE_CHUTE_FIXTURES: CutoutFixtureId[] = [
  WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
]

export const WASTE_CHUTE_ONLY_FIXTURES: CutoutFixtureId[] = [
  WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
]

export const WASTE_CHUTE_STAGING_AREA_FIXTURES: CutoutFixtureId[] = [
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_COVERED_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
]

export const LOW_VOLUME_PIPETTES = ['p50_single_flex', 'p50_multi_flex']

// default hex values for liquid colors
const electricPurple = '#b925ff'
const goldenYellow = '#ffd600'
const aquamarine = '#9dffd8'
const orangePeel = '#ff9900'
const skyBlue = '#50d5ff'
const popPink = '#ff80f5'
const springGreen = '#7eff42'
const tartRed = '#ff4f4f'
export const DEFAULT_LIQUID_COLORS = [
  electricPurple,
  goldenYellow,
  aquamarine,
  orangePeel,
  skyBlue,
  popPink,
  springGreen,
  tartRed,
]
export const DEPRECATED_WHALE_GREY = '#9395a0'

// this can't go in @opentrons/components because its used in a utility
// method in PD (not react code) and we do not want non react code loading
// react code because the web worker context does not play nicely with react
export const INTERACTIVE_WELL_DATA_ATTRIBUTE = 'data-wellname'
