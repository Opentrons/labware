// PD-specific info about labware<>module compatibilty
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
} from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from '../labware-defs'
import type { LabwareOnDeck } from '../step-forms'
import type { LabwareDefinition2, ModuleType } from '@opentrons/shared-data'
// NOTE: this does not distinguish btw versions. Standard labware only (assumes namespace is 'opentrons')

const PLATE_READER_MAX_LABWARE_Z_MM = 16

export const COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE: Record<
  ModuleType,
  Readonly<string[]>
> = {
  [TEMPERATURE_MODULE_TYPE]: [
    'eppendorf_6_wellplate_16.8ml_flat',
    'agilent_24_wellplate_10ml_flat',
    'corning_6_wellplate_16.8ml_flat',
    'corning_12_wellplate_6.9ml_flat',
    'corning_24_wellplate_3.4ml_flat',
    'corning_48_wellplate_1.6ml_flat',
    'corning_96_wellplate_360ul_flat',
    'corning_384_wellplate_112ul_flat',
    'biorad_96_wellplate_200ul_pcr',
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    'usascientific_12_reservoir_22ml', // 'biotix_1_well_reservoir_?ml', // TODO: Ian 2019-10-29 this is in the doc but doesn't exist
    'usascientific_96_wellplate_2.4ml_deep',
    'agilent_1_reservoir_290ml',
    'axygen_1_reservoir_90ml',
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_200ul_flat',
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_96_well_aluminum_block',
    'opentrons_aluminum_flat_bottom_plate',
    'opentrons_96_deep_well_temp_mod_adapter',
  ],
  [MAGNETIC_MODULE_TYPE]: [
    'biorad_96_wellplate_200ul_pcr',
    'usascientific_96_wellplate_2.4ml_deep',
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    'biorad_96_wellplate_200ul_pcr',
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
    'armadillo_96_wellplate_200ul_pcr_full_skirt',
    'biorad_96_wellplate_200ul_pcr',
  ],
  [ABSORBANCE_READER_TYPE]: [
    'opentrons_flex_lid_absorbance_plate_reader_module',
  ],
}
export const getLabwareIsCompatible = (
  def: LabwareDefinition2,
  moduleType: ModuleType
): boolean => {
  console.assert(
    moduleType in COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE,
    `expected ${moduleType} in labware<>module compatibility allowlist`
  )
  const allowlist =
    COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE[moduleType] || []
  return allowlist.includes(def.parameters.loadName)
}

const DEEP_WELL_ADAPTER_LOADNAME = 'opentrons_96_deep_well_adapter'
const FLAT_BOTTOM_ADAPTER_LOADNAME = 'opentrons_96_flat_bottom_adapter'
const PCR_ADAPTER_LOADNAME = 'opentrons_96_pcr_adapter'
const UNIVERSAL_FLAT_ADAPTER_LOADNAME = 'opentrons_universal_flat_adapter'
const ALUMINUM_BLOCK_96_LOADNAME = 'opentrons_96_well_aluminum_block'
const ALUMINUM_FLAT_BOTTOM_PLATE = 'opentrons_aluminum_flat_bottom_plate'
const TEMP_DEEP_WELL_ADAPTER_LOADNAME =
  'opentrons_96_deep_well_temp_mod_adapter'
export const ADAPTER_96_CHANNEL = 'opentrons_flex_96_tiprack_adapter'

export const COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER: Record<
  string,
  string[]
> = {
  [TEMP_DEEP_WELL_ADAPTER_LOADNAME]: ['opentrons/nest_96_wellplate_2ml_deep/2'],
  [DEEP_WELL_ADAPTER_LOADNAME]: ['opentrons/nest_96_wellplate_2ml_deep/2'],
  [FLAT_BOTTOM_ADAPTER_LOADNAME]: ['opentrons/nest_96_wellplate_200ul_flat/2'],
  [PCR_ADAPTER_LOADNAME]: [
    'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
    'opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
    'opentrons/biorad_96_wellplate_200ul_pcr/2',
  ],
  [UNIVERSAL_FLAT_ADAPTER_LOADNAME]: [
    'opentrons/corning_384_wellplate_112ul_flat/2',
    'opentrons/corning_96_wellplate_360ul_flat/2',
    //  TODO(jr, 9/18/23): comment this out for now until these labwares are compatible
    //  with this adapter from the API side
    // 'opentrons/corning_48_wellplate_1.6ml_flat/2',
    // 'opentrons/corning_24_wellplate_3.4ml_flat/2',
    // 'opentrons/corning_12_wellplate_6.9ml_flat/2',
    // 'opentrons/corning_6_wellplate_16.8ml_flat/2',
    // 'opentrons/nest_96_wellplate_200ul_flat/2',
  ],
  [ALUMINUM_BLOCK_96_LOADNAME]: [
    'opentrons/biorad_96_wellplate_200ul_pcr/2',
    'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
    'opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
  ],
  [ALUMINUM_FLAT_BOTTOM_PLATE]: [
    'opentrons/corning_384_wellplate_112ul_flat/2',
    'opentrons/corning_96_wellplate_360ul_flat/2',
    'opentrons/corning_48_wellplate_1.6ml_flat/2',
    'opentrons/corning_24_wellplate_3.4ml_flat/2',
    'opentrons/corning_12_wellplate_6.9ml_flat/2',
    'opentrons/corning_6_wellplate_16.8ml_flat/2',
    'opentrons/nest_96_wellplate_200ul_flat/2',
  ],
  [ADAPTER_96_CHANNEL]: [
    'opentrons/opentrons_flex_96_tiprack_50ul/1',
    'opentrons/opentrons_flex_96_tiprack_200ul/1',
    'opentrons/opentrons_flex_96_tiprack_1000ul/1',
    'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
    'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
    'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
  ],
}

export const getLabwareCompatibleWithAdapter = (
  adapterLoadName?: string
): string[] =>
  adapterLoadName != null
    ? COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER[adapterLoadName]
    : []

export const getLabwareIsCustom = (
  customLabwares: LabwareDefByDefURI,
  labwareOnDeck: LabwareOnDeck
): boolean => {
  return labwareOnDeck.labwareDefURI in customLabwares
}

// This breaks pattern with other module compatibility checks, but it more exactly mirrors Protocol Engine's logic
// See api/src/opentrons/protocol_engine/state/labware.py for details
export const getLabwareCompatibleWithAbsorbanceReader = (
  def: LabwareDefinition2
): boolean => {
  return (
    Object.entries(def.wells).length === 96 &&
    !def.parameters.isTiprack &&
    def.dimensions.zDimension <= PLATE_READER_MAX_LABWARE_Z_MM
  )
}

export const getAdapterLabwareIsAMatch = (
  labwareId: string,
  allLabware: LabwareOnDeck[],
  draggedLabwareLoadname: string
): boolean => {
  const loadName = Object.values(allLabware).find(lab => lab.id === labwareId)
    ?.def.parameters.loadName

  const flatBottomLabwares = [
    'corning_384_wellplate_112ul_flat',
    'corning_96_wellplate_360ul_flat',
    'corning_6_wellplate_16.8ml_flat',
    'corning_384_wellplate_112ul_flat',
    'corning_96_wellplate_360ul_flat',
    'corning_6_wellplate_16.8ml_flat',
    'nest_96_wellplate_200ul_flat',
  ]

  const adapter96Tipracks = [
    'opentrons_flex_96_tiprack_50ul',
    'opentrons_flex_96_tiprack_200ul',
    'opentrons_flex_96_tiprack_1000ul',
    'opentrons_flex_96_filtertiprack_50ul',
    'opentrons_flex_96_filtertiprack_200ul',
    'opentrons_flex_96_filtertiprack_1000ul',
  ]

  const pcrLabwares = [
    'biorad_96_wellplate_200ul_pcr',
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ]

  const deepWellPair =
    loadName === DEEP_WELL_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_2ml_deep'
  const flatBottomPair =
    loadName === FLAT_BOTTOM_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_200ul_flat'
  const pcrPair =
    loadName === PCR_ADAPTER_LOADNAME &&
    pcrLabwares.includes(draggedLabwareLoadname)
  const universalPair =
    loadName === UNIVERSAL_FLAT_ADAPTER_LOADNAME &&
    (draggedLabwareLoadname === 'corning_384_wellplate_112ul_flat' ||
      draggedLabwareLoadname === 'corning_96_wellplate_360ul_flat')
  const aluminumBlock96Pairs =
    loadName === ALUMINUM_BLOCK_96_LOADNAME &&
    pcrLabwares.includes(draggedLabwareLoadname)
  const aluminumFlatBottomPlatePairs =
    loadName === ALUMINUM_FLAT_BOTTOM_PLATE &&
    flatBottomLabwares.includes(draggedLabwareLoadname)
  const adapter96ChannelPairs =
    loadName === ADAPTER_96_CHANNEL &&
    adapter96Tipracks.includes(draggedLabwareLoadname)
  const tempDeepWellAdapterPairs =
    loadName === TEMP_DEEP_WELL_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_2ml_deep'

  if (
    deepWellPair ||
    flatBottomPair ||
    pcrPair ||
    universalPair ||
    aluminumBlock96Pairs ||
    aluminumFlatBottomPlatePairs ||
    adapter96ChannelPairs ||
    tempDeepWellAdapterPairs
  ) {
    return true
  } else {
    return false
  }
}
