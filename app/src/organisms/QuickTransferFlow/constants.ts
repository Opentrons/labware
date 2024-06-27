export const ACTIONS = {
  SELECT_PIPETTE: 'SELECT_PIPETTE',
  SELECT_TIP_RACK: 'SELECT_TIP_RACK',
  SET_SOURCE_LABWARE: 'SET_SOURCE_LABWARE',
  SET_SOURCE_WELLS: 'SET_SOURCE_WELLS',
  SET_DEST_LABWARE: 'SET_DEST_LABWARE',
  SET_DEST_WELLS: 'SET_DEST_WELLS',
  SET_VOLUME: 'SET_VOLUME',
  SET_ASPIRATE_FLOW_RATE: 'SET_ASPIRATE_FLOW_RATE',
  SET_DISPENSE_FLOW_RATE: 'SET_DISPENSE_FLOW_RATE',
  SET_PIPETTE_PATH: 'SET_PIPETTE_PATH',
  SET_ASPIRATE_TIP_POSITION: 'SET_ASPIRATE_TIP_POSITION',
  SET_PRE_WET_TIP: 'SET_PRE_WET_TIP',
  SET_MIX_ON_ASPIRATE: 'SET_MIX_ON_ASPIRATE',
  SET_DELAY_ASPIRATE: 'SET_DELAY_ASPIRATE',
  SET_TOUCH_TIP_ASPIRATE: 'SET_TOUCH_TIP_ASPIRATE',
  SET_AIR_GAP_ASPIRATE: 'SET_AIR_GAP_ASPIRATE',
  SET_DISPENSE_TIP_POSITION: 'SET_DISPENSE_TIP_POSITION',
  SET_MIX_ON_DISPENSE: 'SET_MIX_ON_DISPENSE',
  SET_DELAY_DISPENSE: 'SET_DELAY_DISPENSE',
  SET_TOUCH_TIP_DISPENSE: 'SET_TOUCH_TIP_DISPENSE',
  SET_BLOW_OUT: 'SET_BLOW_OUT',
  SET_AIR_GAP_DISPENSE: 'SET_AIR_GAP_DISPENSE',
  SET_CHANGE_TIP: 'SET_CHANGE_TIP',
  SET_DROP_TIP_LOCATION: 'SET_DROP_TIP_LOCATION',
} as const

export const DISTRIBUTE = 'distribute'
export const CONSOLIDATE = 'consolidate'
export const TRANSFER = 'transfer'

export const DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP = -1
export const DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP = 0

// these lists are generated by the util generateCompatibleLabwareForPipette in ./utils
export const SINGLE_CHANNEL_COMPATIBLE_LABWARE = [
  'opentrons/agilent_1_reservoir_290ml/1',
  'opentrons/appliedbiosystemsmicroamp_384_wellplate_40ul/1',
  'opentrons/axygen_1_reservoir_90ml/1',
  'opentrons/biorad_384_wellplate_50ul/2',
  'opentrons/biorad_96_wellplate_200ul_pcr/2',
  'opentrons/corning_12_wellplate_6.9ml_flat/2',
  'opentrons/corning_24_wellplate_3.4ml_flat/2',
  'opentrons/corning_384_wellplate_112ul_flat/2',
  'opentrons/corning_48_wellplate_1.6ml_flat/2',
  'opentrons/corning_6_wellplate_16.8ml_flat/2',
  'opentrons/corning_96_wellplate_360ul_flat/2',
  'opentrons/geb_96_tiprack_1000ul/1',
  'opentrons/geb_96_tiprack_10ul/1',
  'opentrons/nest_12_reservoir_15ml/1',
  'opentrons/nest_1_reservoir_195ml/2',
  'opentrons/nest_1_reservoir_290ml/1',
  'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  'opentrons/nest_96_wellplate_200ul_flat/2',
  'opentrons/nest_96_wellplate_2ml_deep/2',
  'opentrons/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical/1',
  'opentrons/opentrons_10_tuberack_nest_4x50ml_6x15ml_conical/1',
  'opentrons/opentrons_15_tuberack_falcon_15ml_conical/1',
  'opentrons/opentrons_15_tuberack_nest_15ml_conical/1',
  'opentrons/opentrons_24_aluminumblock_generic_2ml_screwcap/2',
  'opentrons/opentrons_24_aluminumblock_nest_0.5ml_screwcap/1',
  'opentrons/opentrons_24_aluminumblock_nest_1.5ml_screwcap/1',
  'opentrons/opentrons_24_aluminumblock_nest_1.5ml_snapcap/1',
  'opentrons/opentrons_24_aluminumblock_nest_2ml_screwcap/1',
  'opentrons/opentrons_24_aluminumblock_nest_2ml_snapcap/1',
  'opentrons/opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap/1',
  'opentrons/opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap/1',
  'opentrons/opentrons_24_tuberack_generic_2ml_screwcap/1',
  'opentrons/opentrons_24_tuberack_nest_0.5ml_screwcap/1',
  'opentrons/opentrons_24_tuberack_nest_1.5ml_screwcap/1',
  'opentrons/opentrons_24_tuberack_nest_1.5ml_snapcap/1',
  'opentrons/opentrons_24_tuberack_nest_2ml_screwcap/1',
  'opentrons/opentrons_24_tuberack_nest_2ml_snapcap/1',
  'opentrons/opentrons_6_tuberack_falcon_50ml_conical/1',
  'opentrons/opentrons_6_tuberack_nest_50ml_conical/1',
  'opentrons/opentrons_96_aluminumblock_biorad_wellplate_200ul/1',
  'opentrons/opentrons_96_aluminumblock_generic_pcr_strip_200ul/2',
  'opentrons/opentrons_96_aluminumblock_nest_wellplate_100ul/1',
  'opentrons/opentrons_96_deep_well_adapter/1',
  'opentrons/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1',
  'opentrons/opentrons_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_96_filtertiprack_10ul/1',
  'opentrons/opentrons_96_filtertiprack_200ul/1',
  'opentrons/opentrons_96_filtertiprack_20ul/1',
  'opentrons/opentrons_96_flat_bottom_adapter/1',
  'opentrons/opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1',
  'opentrons/opentrons_96_pcr_adapter/1',
  'opentrons/opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt/1',
  'opentrons/opentrons_96_tiprack_1000ul/1',
  'opentrons/opentrons_96_tiprack_10ul/1',
  'opentrons/opentrons_96_tiprack_20ul/1',
  'opentrons/opentrons_96_tiprack_300ul/1',
  'opentrons/opentrons_96_well_aluminum_block/1',
  'opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
  'opentrons/opentrons_aluminum_flat_bottom_plate/1',
  'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
  'opentrons/opentrons_flex_96_tiprack_1000ul/1',
  'opentrons/opentrons_flex_96_tiprack_200ul/1',
  'opentrons/opentrons_flex_96_tiprack_50ul/1',
  'opentrons/opentrons_flex_96_tiprack_adapter/1',
  'opentrons/opentrons_universal_flat_adapter/1',
  'opentrons/opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat/1',
  'opentrons/thermoscientificnunc_96_wellplate_1300ul/1',
  'opentrons/thermoscientificnunc_96_wellplate_2000ul/1',
  'opentrons/usascientific_12_reservoir_22ml/1',
  'opentrons/usascientific_96_wellplate_2.4ml_deep/1',
]

export const EIGHT_CHANNEL_COMPATIBLE_LABWARE = [
  'opentrons/agilent_1_reservoir_290ml/1',
  'opentrons/appliedbiosystemsmicroamp_384_wellplate_40ul/1',
  'opentrons/axygen_1_reservoir_90ml/1',
  'opentrons/biorad_384_wellplate_50ul/2',
  'opentrons/biorad_96_wellplate_200ul_pcr/2',
  'opentrons/corning_384_wellplate_112ul_flat/2',
  'opentrons/corning_96_wellplate_360ul_flat/2',
  'opentrons/geb_96_tiprack_1000ul/1',
  'opentrons/geb_96_tiprack_10ul/1',
  'opentrons/nest_12_reservoir_15ml/1',
  'opentrons/nest_1_reservoir_195ml/2',
  'opentrons/nest_1_reservoir_290ml/1',
  'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  'opentrons/nest_96_wellplate_200ul_flat/2',
  'opentrons/nest_96_wellplate_2ml_deep/2',
  'opentrons/opentrons_96_aluminumblock_biorad_wellplate_200ul/1',
  'opentrons/opentrons_96_aluminumblock_generic_pcr_strip_200ul/2',
  'opentrons/opentrons_96_aluminumblock_nest_wellplate_100ul/1',
  'opentrons/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1',
  'opentrons/opentrons_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_96_filtertiprack_10ul/1',
  'opentrons/opentrons_96_filtertiprack_200ul/1',
  'opentrons/opentrons_96_filtertiprack_20ul/1',
  'opentrons/opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1',
  'opentrons/opentrons_96_pcr_adapter/1',
  'opentrons/opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt/1',
  'opentrons/opentrons_96_tiprack_1000ul/1',
  'opentrons/opentrons_96_tiprack_10ul/1',
  'opentrons/opentrons_96_tiprack_20ul/1',
  'opentrons/opentrons_96_tiprack_300ul/1',
  'opentrons/opentrons_96_well_aluminum_block/1',
  'opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
  'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
  'opentrons/opentrons_flex_96_tiprack_1000ul/1',
  'opentrons/opentrons_flex_96_tiprack_200ul/1',
  'opentrons/opentrons_flex_96_tiprack_50ul/1',
  'opentrons/opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat/1',
  'opentrons/thermoscientificnunc_96_wellplate_1300ul/1',
  'opentrons/thermoscientificnunc_96_wellplate_2000ul/1',
  'opentrons/usascientific_12_reservoir_22ml/1',
  'opentrons/usascientific_96_wellplate_2.4ml_deep/1',
]

export const NINETY_SIX_CHANNEL_COMPATIBLE_LABWARE = [
  'opentrons/agilent_1_reservoir_290ml/1',
  'opentrons/appliedbiosystemsmicroamp_384_wellplate_40ul/1',
  'opentrons/axygen_1_reservoir_90ml/1',
  'opentrons/biorad_384_wellplate_50ul/2',
  'opentrons/biorad_96_wellplate_200ul_pcr/2',
  'opentrons/corning_384_wellplate_112ul_flat/2',
  'opentrons/corning_96_wellplate_360ul_flat/2',
  'opentrons/geb_96_tiprack_1000ul/1',
  'opentrons/geb_96_tiprack_10ul/1',
  'opentrons/nest_12_reservoir_15ml/1',
  'opentrons/nest_1_reservoir_195ml/2',
  'opentrons/nest_1_reservoir_290ml/1',
  'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  'opentrons/nest_96_wellplate_200ul_flat/2',
  'opentrons/nest_96_wellplate_2ml_deep/2',
  'opentrons/opentrons_96_aluminumblock_biorad_wellplate_200ul/1',
  'opentrons/opentrons_96_aluminumblock_generic_pcr_strip_200ul/2',
  'opentrons/opentrons_96_aluminumblock_nest_wellplate_100ul/1',
  'opentrons/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1',
  'opentrons/opentrons_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_96_filtertiprack_10ul/1',
  'opentrons/opentrons_96_filtertiprack_200ul/1',
  'opentrons/opentrons_96_filtertiprack_20ul/1',
  'opentrons/opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1',
  'opentrons/opentrons_96_pcr_adapter/1',
  'opentrons/opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt/1',
  'opentrons/opentrons_96_tiprack_1000ul/1',
  'opentrons/opentrons_96_tiprack_10ul/1',
  'opentrons/opentrons_96_tiprack_20ul/1',
  'opentrons/opentrons_96_tiprack_300ul/1',
  'opentrons/opentrons_96_well_aluminum_block/1',
  'opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
  'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
  'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
  'opentrons/opentrons_flex_96_tiprack_1000ul/1',
  'opentrons/opentrons_flex_96_tiprack_200ul/1',
  'opentrons/opentrons_flex_96_tiprack_50ul/1',
  'opentrons/opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat/1',
  'opentrons/thermoscientificnunc_96_wellplate_1300ul/1',
  'opentrons/thermoscientificnunc_96_wellplate_2000ul/1',
  'opentrons/usascientific_12_reservoir_22ml/1',
  'opentrons/usascientific_96_wellplate_2.4ml_deep/1',
]
