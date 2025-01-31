import labwareSchemaV2 from '../labware/schemas/2.json'
import fixture96Plate from '../labware/fixtures/2/fixture_96_plate.json'
import fixture12Trough from '../labware/fixtures/2/fixture_12_trough.json'
import fixture24Tuberack from '../labware/fixtures/2/fixture_24_tuberack.json'
import fixtureTiprack10ul from '../labware/fixtures/2/fixture_tiprack_10_ul.json'
import fixtureTiprack300ul from '../labware/fixtures/2/fixture_tiprack_300_ul.json'
import fixtureTiprack1000ul from '../labware/fixtures/2/fixture_flex_96_tiprack_1000ul.json'
import fixtureTiprackAdapter from '../labware/fixtures/2/fixture_flex_96_tiprack_adapter.json'
import fixtureCalibrationBlock from '../labware/fixtures/2/fixture_calibration_block.json'
import fixture384Plate from '../labware/fixtures/2/fixture_384_plate.json'
import fixtureTrash from '../labware/fixtures/2/fixture_trash.json'
import { getLabwareDefURI } from './helpers/index'

// v2 labware definitions
import agilent1Reservoir290MlV1Uncasted from '../labware/definitions/2/agilent_1_reservoir_290ml/1.json'
import appliedbiosystemsmicroamp384Wellplate40UlV1Uncasted from '../labware/definitions/2/appliedbiosystemsmicroamp_384_wellplate_40ul/1.json'
import armadillo96Wellplate200UlPcrFullSkirtV1Uncasted from '../labware/definitions/2/armadillo_96_wellplate_200ul_pcr_full_skirt/1.json'
import armadillo96Wellplate200UlPcrFullSkirtV2Uncasted from '../labware/definitions/2/armadillo_96_wellplate_200ul_pcr_full_skirt/2.json'
import axygen1Reservoir90MlV1Uncasted from '../labware/definitions/2/axygen_1_reservoir_90ml/1.json'
import biorad384Wellplate50UlV1Uncasted from '../labware/definitions/2/biorad_384_wellplate_50ul/1.json'
import biorad384Wellplate50UlV2Uncasted from '../labware/definitions/2/biorad_384_wellplate_50ul/2.json'
import biorad96Wellplate200UlPcrV1Uncasted from '../labware/definitions/2/biorad_96_wellplate_200ul_pcr/1.json'
import biorad96Wellplate200UlPcrV2Uncasted from '../labware/definitions/2/biorad_96_wellplate_200ul_pcr/2.json'
import corning12Wellplate69MlFlatV1Uncasted from '../labware/definitions/2/corning_12_wellplate_6.9ml_flat/1.json'
import corning12Wellplate69MlFlatV2Uncasted from '../labware/definitions/2/corning_12_wellplate_6.9ml_flat/2.json'
import corning24Wellplate34MlFlatV1Uncasted from '../labware/definitions/2/corning_24_wellplate_3.4ml_flat/1.json'
import corning24Wellplate34MlFlatV2Uncasted from '../labware/definitions/2/corning_24_wellplate_3.4ml_flat/2.json'
import corning384Wellplate112UlFlatV1Uncasted from '../labware/definitions/2/corning_384_wellplate_112ul_flat/1.json'
import corning384Wellplate112UlFlatV2Uncasted from '../labware/definitions/2/corning_384_wellplate_112ul_flat/2.json'
import corning48Wellplate16MlFlatV1Uncasted from '../labware/definitions/2/corning_48_wellplate_1.6ml_flat/1.json'
import corning48Wellplate16MlFlatV2Uncasted from '../labware/definitions/2/corning_48_wellplate_1.6ml_flat/2.json'
import corning6Wellplate168MlFlatV1Uncasted from '../labware/definitions/2/corning_6_wellplate_16.8ml_flat/1.json'
import corning6Wellplate168MlFlatV2Uncasted from '../labware/definitions/2/corning_6_wellplate_16.8ml_flat/2.json'
import corning96Wellplate360UlFlatV1Uncasted from '../labware/definitions/2/corning_96_wellplate_360ul_flat/1.json'
import corning96Wellplate360UlFlatV2Uncasted from '../labware/definitions/2/corning_96_wellplate_360ul_flat/2.json'
import eppendorf96Tiprack1000UlEptipsV1Uncasted from '../labware/definitions/2/eppendorf_96_tiprack_1000ul_eptips/1.json'
import eppendorf96Tiprack10UlEptipsV1Uncasted from '../labware/definitions/2/eppendorf_96_tiprack_10ul_eptips/1.json'
import geb96Tiprack1000UlV1Uncasted from '../labware/definitions/2/geb_96_tiprack_1000ul/1.json'
import geb96Tiprack10UlV1Uncasted from '../labware/definitions/2/geb_96_tiprack_10ul/1.json'
import nest12Reservoir15MlV1Uncasted from '../labware/definitions/2/nest_12_reservoir_15ml/1.json'
import nest1Reservoir195MlV1Uncasted from '../labware/definitions/2/nest_1_reservoir_195ml/1.json'
import nest1Reservoir195MlV2Uncasted from '../labware/definitions/2/nest_1_reservoir_195ml/2.json'
import nest1Reservoir290MlV1Uncasted from '../labware/definitions/2/nest_1_reservoir_290ml/1.json'
import nest96Wellplate100UlPcrFullSkirtV1Uncasted from '../labware/definitions/2/nest_96_wellplate_100ul_pcr_full_skirt/1.json'
import nest96Wellplate100UlPcrFullSkirtV2Uncasted from '../labware/definitions/2/nest_96_wellplate_100ul_pcr_full_skirt/2.json'
import nest96Wellplate200UlFlatV1Uncasted from '../labware/definitions/2/nest_96_wellplate_200ul_flat/1.json'
import nest96Wellplate200UlFlatV2Uncasted from '../labware/definitions/2/nest_96_wellplate_200ul_flat/2.json'
import nest96Wellplate2MlDeepV1Uncasted from '../labware/definitions/2/nest_96_wellplate_2ml_deep/1.json'
import nest96Wellplate2MlDeepV2Uncasted from '../labware/definitions/2/nest_96_wellplate_2ml_deep/2.json'
import opentrons10TuberackFalcon4X50Ml6X15MlConicalV1Uncasted from '../labware/definitions/2/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical/1.json'
import opentrons10TuberackFalcon4X50Ml6X15MlConicalAcrylicV1Uncasted from '../labware/definitions/2/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic/1.json'
import opentrons10TuberackNest4X50Ml6X15MlConicalV1Uncasted from '../labware/definitions/2/opentrons_10_tuberack_nest_4x50ml_6x15ml_conical/1.json'
import opentrons15TuberackFalcon15MlConicalV1Uncasted from '../labware/definitions/2/opentrons_15_tuberack_falcon_15ml_conical/1.json'
import opentrons15TuberackNest15MlConicalV1Uncasted from '../labware/definitions/2/opentrons_15_tuberack_nest_15ml_conical/1.json'
import opentrons1Trash3200MlFixedV1Uncasted from '../labware/definitions/2/opentrons_1_trash_3200ml_fixed/1.json'
import opentrons1Trash1100MlFixedV1Uncasted from '../labware/definitions/2/opentrons_1_trash_1100ml_fixed/1.json'
import opentrons1Trash850MlFixedV1Uncasted from '../labware/definitions/2/opentrons_1_trash_850ml_fixed/1.json'
import opentrons24AluminumblockGeneric2MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_generic_2ml_screwcap/1.json'
import opentrons24AluminumblockGeneric2MlScrewcapV2Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_generic_2ml_screwcap/2.json'
import opentrons24AluminumblockNest05MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_nest_0.5ml_screwcap/1.json'
import opentrons24AluminumblockNest15MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_nest_1.5ml_screwcap/1.json'
import opentrons24AluminumblockNest15MlSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_nest_1.5ml_snapcap/1.json'
import opentrons24AluminumblockNest2MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_nest_2ml_screwcap/1.json'
import opentrons24AluminumblockNest2MlSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_aluminumblock_nest_2ml_snapcap/1.json'
import opentrons24TuberackEppendorf15MlSafelockSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap/1.json'
import opentrons24TuberackEppendorf2MlSafelockSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap/1.json'
import opentrons24TuberackEppendorf2MlSafelockSnapcapAcrylicV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap_acrylic/1.json'
import opentrons24TuberackGeneric075MlSnapcapAcrylicV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_generic_0.75ml_snapcap_acrylic/1.json'
import opentrons24TuberackGeneric2MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_generic_2ml_screwcap/1.json'
import opentrons24TuberackNest05MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_nest_0.5ml_screwcap/1.json'
import opentrons24TuberackNest15MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_nest_1.5ml_screwcap/1.json'
import opentrons24TuberackNest15MlSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_nest_1.5ml_snapcap/1.json'
import opentrons24TuberackNest2MlScrewcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_nest_2ml_screwcap/1.json'
import opentrons24TuberackNest2MlSnapcapV1Uncasted from '../labware/definitions/2/opentrons_24_tuberack_nest_2ml_snapcap/1.json'
import opentrons40AluminumblockEppendorf24X2MlSafelockSnapcapGeneric16X02MlPcrStripV1Uncasted from '../labware/definitions/2/opentrons_40_aluminumblock_eppendorf_24x2ml_safelock_snapcap_generic_16x0.2ml_pcr_strip/1.json'
import opentrons6TuberackFalcon50MlConicalV1Uncasted from '../labware/definitions/2/opentrons_6_tuberack_falcon_50ml_conical/1.json'
import opentrons6TuberackNest50MlConicalV1Uncasted from '../labware/definitions/2/opentrons_6_tuberack_nest_50ml_conical/1.json'
import opentrons96AluminumblockBioradWellplate200UlV1Uncasted from '../labware/definitions/2/opentrons_96_aluminumblock_biorad_wellplate_200ul/1.json'
import opentrons96AluminumblockGenericPcrStrip200UlV1Uncasted from '../labware/definitions/2/opentrons_96_aluminumblock_generic_pcr_strip_200ul/1.json'
import opentrons96AluminumblockGenericPcrStrip200UlV2Uncasted from '../labware/definitions/2/opentrons_96_aluminumblock_generic_pcr_strip_200ul/2.json'
import opentrons96AluminumblockNestWellplate100UlV1Uncasted from '../labware/definitions/2/opentrons_96_aluminumblock_nest_wellplate_100ul/1.json'
import opentrons96DeepWellAdapterV1Uncasted from '../labware/definitions/2/opentrons_96_deep_well_adapter/1.json'
import opentrons96DeepWellAdapterNestWellplate2MlDeepV1Uncasted from '../labware/definitions/2/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1.json'
import opentrons96Filtertiprack1000UlV1Uncasted from '../labware/definitions/2/opentrons_96_filtertiprack_1000ul/1.json'
import opentrons96Filtertiprack10UlV1Uncasted from '../labware/definitions/2/opentrons_96_filtertiprack_10ul/1.json'
import opentrons96Filtertiprack200UlV1Uncasted from '../labware/definitions/2/opentrons_96_filtertiprack_200ul/1.json'
import opentrons96Filtertiprack20UlV1Uncasted from '../labware/definitions/2/opentrons_96_filtertiprack_20ul/1.json'
import opentrons96FlatBottomAdapterV1Uncasted from '../labware/definitions/2/opentrons_96_flat_bottom_adapter/1.json'
import opentrons96FlatBottomAdapterNestWellplate200UlFlatV1Uncasted from '../labware/definitions/2/opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1.json'
import opentrons96PcrAdapterV1Uncasted from '../labware/definitions/2/opentrons_96_pcr_adapter/1.json'
import opentrons96PcrAdapterArmadilloWellplate200UlV1Uncasted from '../labware/definitions/2/opentrons_96_pcr_adapter_armadillo_wellplate_200ul/1.json'
import opentrons96PcrAdapterNestWellplate100UlPcrFullSkirtV1Uncasted from '../labware/definitions/2/opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt/1.json'
import opentrons96Tiprack1000UlV1Uncasted from '../labware/definitions/2/opentrons_96_tiprack_1000ul/1.json'
import opentrons96Tiprack10UlV1Uncasted from '../labware/definitions/2/opentrons_96_tiprack_10ul/1.json'
import opentrons96Tiprack20UlV1Uncasted from '../labware/definitions/2/opentrons_96_tiprack_20ul/1.json'
import opentrons96Tiprack300UlV1Uncasted from '../labware/definitions/2/opentrons_96_tiprack_300ul/1.json'
import opentrons96WellAluminumBlockV1Uncasted from '../labware/definitions/2/opentrons_96_well_aluminum_block/1.json'
import opentrons96Wellplate200UlPcrFullSkirtV1Uncasted from '../labware/definitions/2/opentrons_96_wellplate_200ul_pcr_full_skirt/1.json'
import opentrons96Wellplate200UlPcrFullSkirtV2Uncasted from '../labware/definitions/2/opentrons_96_wellplate_200ul_pcr_full_skirt/2.json'
import opentronsAluminumFlatBottomPlateV1Uncasted from '../labware/definitions/2/opentrons_aluminum_flat_bottom_plate/1.json'
import opentronsCalibrationAdapterHeatershakerModuleV1Uncasted from '../labware/definitions/2/opentrons_calibration_adapter_heatershaker_module/1.json'
import opentronsCalibrationAdapterTemperatureModuleV1Uncasted from '../labware/definitions/2/opentrons_calibration_adapter_temperature_module/1.json'
import opentronsCalibrationAdapterThermocyclerModuleV1Uncasted from '../labware/definitions/2/opentrons_calibration_adapter_thermocycler_module/1.json'
import opentronsCalibrationblockShortSideLeftV1Uncasted from '../labware/definitions/2/opentrons_calibrationblock_short_side_left/1.json'
import opentronsCalibrationblockShortSideRightV1Uncasted from '../labware/definitions/2/opentrons_calibrationblock_short_side_right/1.json'
import opentronsFlex96Filtertiprack1000UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_filtertiprack_1000ul/1.json'
import opentronsFlex96Filtertiprack200UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_filtertiprack_200ul/1.json'
import opentronsFlex96Filtertiprack50UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_filtertiprack_50ul/1.json'
import opentronsFlex96Tiprack1000UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_tiprack_1000ul/1.json'
import opentronsFlex96Tiprack200UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_tiprack_200ul/1.json'
import opentronsFlex96Tiprack50UlV1Uncasted from '../labware/definitions/2/opentrons_flex_96_tiprack_50ul/1.json'
import opentronsFlex96TiprackAdapterV1Uncasted from '../labware/definitions/2/opentrons_flex_96_tiprack_adapter/1.json'
import opentronsFlexDeckRiserV1Uncasted from '../labware/definitions/2/opentrons_flex_deck_riser/1.json'
import opentronsFlexLidAbsorbancePlateReaderModuleV1Uncasted from '../labware/definitions/2/opentrons_flex_lid_absorbance_plate_reader_module/1.json'
import opentronsToughPcrAutoSealingLidV1Uncasted from '../labware/definitions/3/opentrons_tough_pcr_auto_sealing_lid/1.json'
import opentronsUniversalFlatAdapterV1Uncasted from '../labware/definitions/2/opentrons_universal_flat_adapter/1.json'
import opentronsUniversalFlatAdapterCorning384Wellplate112UlFlatV1Uncasted from '../labware/definitions/2/opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat/1.json'
import opentrons96DeepWellTempModAdapterV1Uncasted from '../labware/definitions/2/opentrons_96_deep_well_temp_mod_adapter/1.json'
import thermoscientificnunc96Wellplate1300UlV1Uncasted from '../labware/definitions/2/thermoscientificnunc_96_wellplate_1300ul/1.json'
import thermoscientificnunc96Wellplate2000UlV1Uncasted from '../labware/definitions/2/thermoscientificnunc_96_wellplate_2000ul/1.json'
import tipone96Tiprack200UlV1Uncasted from '../labware/definitions/2/tipone_96_tiprack_200ul/1.json'
import usascientific12Reservoir22MlV1Uncasted from '../labware/definitions/2/usascientific_12_reservoir_22ml/1.json'
import usascientific96Wellplate24MlDeepV1Uncasted from '../labware/definitions/2/usascientific_96_wellplate_2.4ml_deep/1.json'
import evotipsFlex96TiprackAdapterV1Uncasted from '../labware/definitions/3/evotips_flex_96_tiprack_adapter/1.json'
import evotipsOpentrons96LabwareV1Uncasted from '../labware/definitions/3/evotips_opentrons_96_labware/1.json'

// v1 legacy labware definitions

import wellPlate12Uncasted from '../labware/definitions/1/12-well-plate.json'
import vial24RackUncasted from '../labware/definitions/1/24-vial-rack.json'
import well24PlateUncasted from '../labware/definitions/1/24-well-plate.json'
import plate384Uncasted from '../labware/definitions/1/384-plate.json'
import vialPlate48Uncasted from '../labware/definitions/1/48-vial-plate.json'
import wellPlate48Uncasted from '../labware/definitions/1/48-well-plate.json'
import tuberack5Ml3X4Uncasted from '../labware/definitions/1/5ml-3x4.json'
import wellPlate6Uncasted from '../labware/definitions/1/6-well-plate.json'
import pcr96FlatUncasted from '../labware/definitions/1/96-PCR-flat.json'
import pcr96PTallUncasted from '../labware/definitions/1/96-PCR-tall.json'
import deepWell96Uncasted from '../labware/definitions/1/96-deep-well.json'
import flat96Uncasted from '../labware/definitions/1/96-flat.json'
import wellPlate20Mm96Uncasted from '../labware/definitions/1/96-well-plate-20mm.json'
import maldiPlateUncasted from '../labware/definitions/1/MALDI-plate.json'
import pcrStripTallUncasted from '../labware/definitions/1/PCR-strip-tall.json'
import t25FlaskUncasted from '../labware/definitions/1/T25-flask.json'
import t75FlaskUncasted from '../labware/definitions/1/T75-flask.json'
import alumBlockPcrStripsUncasted from '../labware/definitions/1/alum-block-pcr-strips.json'
import bioradHardshell96PcrUncasted from '../labware/definitions/1/biorad-hardshell-96-PCR.json'
import eGelgolUncasted from '../labware/definitions/1/e-gelgol.json'
import fixedTrashUncasted from '../labware/definitions/1/fixed-trash.json'
import hampton1MlDeepBlockUncasted from '../labware/definitions/1/hampton-1ml-deep-block.json'
import opentronsAluminumBlock2MlEppendorfUncasted from '../labware/definitions/1/opentrons-aluminum-block-2ml-eppendorf.json'
import opentronsAluminumBlock2MlScrewcapUncasted from '../labware/definitions/1/opentrons-aluminum-block-2ml-screwcap.json'
import opentronsAluminumBlock96PcrPlateUncasted from '../labware/definitions/1/opentrons-aluminum-block-96-PCR-plate.json'
import opentronsAluminumBlockPcrStrips200UlUncasted from '../labware/definitions/1/opentrons-aluminum-block-PCR-strips-200ul.json'
import opentronsTiprack10UlUncasted from '../labware/definitions/1/opentrons-tiprack-10ul.json'
import opentronsTiprack300UlUncasted from '../labware/definitions/1/opentrons-tiprack-300ul.json'
import opentronsTuberack15MlEppendorfUncasted from '../labware/definitions/1/opentrons-tuberack-1.5ml-eppendorf.json'
import opentronsTuberack1550MlUncasted from '../labware/definitions/1/opentrons-tuberack-15_50ml.json'
import opentronsTuberack15MlUncasted from '../labware/definitions/1/opentrons-tuberack-15ml.json'
import opentronsTuberack2MlEppendorfUncasted from '../labware/definitions/1/opentrons-tuberack-2ml-eppendorf.json'
import opentronsTuberack2MlScrewcapUncasted from '../labware/definitions/1/opentrons-tuberack-2ml-screwcap.json'
import opentronsTuberack50MlUncasted from '../labware/definitions/1/opentrons-tuberack-50ml.json'
import pointUncasted from '../labware/definitions/1/point.json'
import rigakuCompactCrystallizationPlateUncasted from '../labware/definitions/1/rigaku-compact-crystallization-plate.json'
import smallVialRack16X45Uncasted from '../labware/definitions/1/small_vial_rack_16x45.json'
import tallFixedTrashUncasted from '../labware/definitions/1/tall-fixed-trash.json'
import tiprack1000UlHUncasted from '../labware/definitions/1/tiprack-1000ul-H.json'
import tiprack1000UlChemUncasted from '../labware/definitions/1/tiprack-1000ul-chem.json'
import tiprack1000UlUncasted from '../labware/definitions/1/tiprack-1000ul.json'
import tiprack10UlHUncasted from '../labware/definitions/1/tiprack-10ul-H.json'
import tiprack10UlUncasted from '../labware/definitions/1/tiprack-10ul.json'
import tiprack200UlUncasted from '../labware/definitions/1/tiprack-200ul.json'
import trashBoxUncasted from '../labware/definitions/1/trash-box.json'
import trough12RowShortUncasted from '../labware/definitions/1/trough-12row-short.json'
import trough12RowUncasted from '../labware/definitions/1/trough-12row.json'
import trough1Row25MlUncasted from '../labware/definitions/1/trough-1row-25ml.json'
import tubeRack75MlUncasted from '../labware/definitions/1/tube-rack-.75ml.json'
import tubeRack1550MlUncasted from '../labware/definitions/1/tube-rack-15_50ml.json'
import tubeRack2Ml9X9Uncasted from '../labware/definitions/1/tube-rack-2ml-9x9.json'
import tubeRack2MlUncasted from '../labware/definitions/1/tube-rack-2ml.json'
import tubeRack5Ml96Uncasted from '../labware/definitions/1/tube-rack-5ml-96.json'
import tubeRack80WellUncasted from '../labware/definitions/1/tube-rack-80well.json'
import wheatonVialRackUncasted from '../labware/definitions/1/wheaton_vial_rack.json'

import type {
  LabwareDefByDefURI,
  LabwareDefinition1,
  LabwareDefinition2,
  LegacyLabwareDefByName,
} from './types'

// cast v2 defs
const agilent1Reservoir290MlV1 = agilent1Reservoir290MlV1Uncasted as LabwareDefinition2
const appliedbiosystemsmicroamp384Wellplate40UlV1 = appliedbiosystemsmicroamp384Wellplate40UlV1Uncasted as LabwareDefinition2
const armadillo96Wellplate200UlPcrFullSkirtV2 = armadillo96Wellplate200UlPcrFullSkirtV2Uncasted as LabwareDefinition2
const armadillo96Wellplate200UlPcrFullSkirtV1 = armadillo96Wellplate200UlPcrFullSkirtV1Uncasted as LabwareDefinition2
const axygen1Reservoir90MlV1 = axygen1Reservoir90MlV1Uncasted as LabwareDefinition2
const biorad384Wellplate50UlV2 = biorad384Wellplate50UlV2Uncasted as LabwareDefinition2
const biorad384Wellplate50UlV1 = biorad384Wellplate50UlV1Uncasted as LabwareDefinition2
const biorad96Wellplate200UlPcrV2 = biorad96Wellplate200UlPcrV2Uncasted as LabwareDefinition2
const biorad96Wellplate200UlPcrV1 = biorad96Wellplate200UlPcrV1Uncasted as LabwareDefinition2
const corning12Wellplate69MlFlatV2 = corning12Wellplate69MlFlatV2Uncasted as LabwareDefinition2
const corning12Wellplate69MlFlatV1 = corning12Wellplate69MlFlatV1Uncasted as LabwareDefinition2
const corning24Wellplate34MlFlatV2 = corning24Wellplate34MlFlatV2Uncasted as LabwareDefinition2
const corning24Wellplate34MlFlatV1 = corning24Wellplate34MlFlatV1Uncasted as LabwareDefinition2
const corning384Wellplate112UlFlatV2 = corning384Wellplate112UlFlatV2Uncasted as LabwareDefinition2
const corning384Wellplate112UlFlatV1 = corning384Wellplate112UlFlatV1Uncasted as LabwareDefinition2
const corning48Wellplate16MlFlatV2 = corning48Wellplate16MlFlatV2Uncasted as LabwareDefinition2
const corning48Wellplate16MlFlatV1 = corning48Wellplate16MlFlatV1Uncasted as LabwareDefinition2
const corning6Wellplate168MlFlatV2 = corning6Wellplate168MlFlatV2Uncasted as LabwareDefinition2
const corning6Wellplate168MlFlatV1 = corning6Wellplate168MlFlatV1Uncasted as LabwareDefinition2
const corning96Wellplate360UlFlatV2 = corning96Wellplate360UlFlatV2Uncasted as LabwareDefinition2
const corning96Wellplate360UlFlatV1 = corning96Wellplate360UlFlatV1Uncasted as LabwareDefinition2
const eppendorf96Tiprack1000UlEptipsV1 = eppendorf96Tiprack1000UlEptipsV1Uncasted as LabwareDefinition2
const eppendorf96Tiprack10UlEptipsV1 = eppendorf96Tiprack10UlEptipsV1Uncasted as LabwareDefinition2
const geb96Tiprack1000UlV1 = geb96Tiprack1000UlV1Uncasted as LabwareDefinition2
const geb96Tiprack10UlV1 = geb96Tiprack10UlV1Uncasted as LabwareDefinition2
const nest12Reservoir15MlV1 = nest12Reservoir15MlV1Uncasted as LabwareDefinition2
const nest1Reservoir195MlV2 = nest1Reservoir195MlV2Uncasted as LabwareDefinition2
const nest1Reservoir195MlV1 = nest1Reservoir195MlV1Uncasted as LabwareDefinition2
const nest1Reservoir290MlV1 = nest1Reservoir290MlV1Uncasted as LabwareDefinition2
const nest96Wellplate100UlPcrFullSkirtV2 = nest96Wellplate100UlPcrFullSkirtV2Uncasted as LabwareDefinition2
const nest96Wellplate100UlPcrFullSkirtV1 = nest96Wellplate100UlPcrFullSkirtV1Uncasted as LabwareDefinition2
const nest96Wellplate200UlFlatV2 = nest96Wellplate200UlFlatV2Uncasted as LabwareDefinition2
const nest96Wellplate200UlFlatV1 = nest96Wellplate200UlFlatV1Uncasted as LabwareDefinition2
const nest96Wellplate2MlDeepV2 = nest96Wellplate2MlDeepV2Uncasted as LabwareDefinition2
const nest96Wellplate2MlDeepV1 = nest96Wellplate2MlDeepV1Uncasted as LabwareDefinition2
const opentrons10TuberackFalcon4X50Ml6X15MlConicalV1 = opentrons10TuberackFalcon4X50Ml6X15MlConicalV1Uncasted as LabwareDefinition2
const opentrons10TuberackFalcon4X50Ml6X15MlConicalAcrylicV1 = opentrons10TuberackFalcon4X50Ml6X15MlConicalAcrylicV1Uncasted as LabwareDefinition2
const opentrons10TuberackNest4X50Ml6X15MlConicalV1 = opentrons10TuberackNest4X50Ml6X15MlConicalV1Uncasted as LabwareDefinition2
const opentrons15TuberackFalcon15MlConicalV1 = opentrons15TuberackFalcon15MlConicalV1Uncasted as LabwareDefinition2
const opentrons15TuberackNest15MlConicalV1 = opentrons15TuberackNest15MlConicalV1Uncasted as LabwareDefinition2
const opentrons1Trash1100MlFixedV1 = opentrons1Trash1100MlFixedV1Uncasted as LabwareDefinition2
const opentrons1Trash3200MlFixedV1 = opentrons1Trash3200MlFixedV1Uncasted as LabwareDefinition2
const opentrons1Trash850MlFixedV1 = opentrons1Trash850MlFixedV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockGeneric2MlScrewcapV2 = opentrons24AluminumblockGeneric2MlScrewcapV2Uncasted as LabwareDefinition2
const opentrons24AluminumblockGeneric2MlScrewcapV1 = opentrons24AluminumblockGeneric2MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockNest05MlScrewcapV1 = opentrons24AluminumblockNest05MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockNest15MlScrewcapV1 = opentrons24AluminumblockNest15MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockNest15MlSnapcapV1 = opentrons24AluminumblockNest15MlSnapcapV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockNest2MlScrewcapV1 = opentrons24AluminumblockNest2MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24AluminumblockNest2MlSnapcapV1 = opentrons24AluminumblockNest2MlSnapcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackEppendorf15MlSafelockSnapcapV1 = opentrons24TuberackEppendorf15MlSafelockSnapcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackEppendorf2MlSafelockSnapcapV1 = opentrons24TuberackEppendorf2MlSafelockSnapcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackEppendorf2MlSafelockSnapcapAcrylicV1 = opentrons24TuberackEppendorf2MlSafelockSnapcapAcrylicV1Uncasted as LabwareDefinition2
const opentrons24TuberackGeneric075MlSnapcapAcrylicV1 = opentrons24TuberackGeneric075MlSnapcapAcrylicV1Uncasted as LabwareDefinition2
const opentrons24TuberackGeneric2MlScrewcapV1 = opentrons24TuberackGeneric2MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackNest05MlScrewcapV1 = opentrons24TuberackNest05MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackNest15MlScrewcapV1 = opentrons24TuberackNest15MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackNest15MlSnapcapV1 = opentrons24TuberackNest15MlSnapcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackNest2MlScrewcapV1 = opentrons24TuberackNest2MlScrewcapV1Uncasted as LabwareDefinition2
const opentrons24TuberackNest2MlSnapcapV1 = opentrons24TuberackNest2MlSnapcapV1Uncasted as LabwareDefinition2
const opentrons40AluminumblockEppendorf24X2MlSafelockSnapcapGeneric16X02MlPcrStripV1 = opentrons40AluminumblockEppendorf24X2MlSafelockSnapcapGeneric16X02MlPcrStripV1Uncasted as LabwareDefinition2
const opentrons6TuberackFalcon50MlConicalV1 = opentrons6TuberackFalcon50MlConicalV1Uncasted as LabwareDefinition2
const opentrons6TuberackNest50MlConicalV1 = opentrons6TuberackNest50MlConicalV1Uncasted as LabwareDefinition2
const opentrons96AluminumblockBioradWellplate200UlV1 = opentrons96AluminumblockBioradWellplate200UlV1Uncasted as LabwareDefinition2
const opentrons96AluminumblockGenericPcrStrip200UlV2 = opentrons96AluminumblockGenericPcrStrip200UlV2Uncasted as LabwareDefinition2
const opentrons96AluminumblockGenericPcrStrip200UlV1 = opentrons96AluminumblockGenericPcrStrip200UlV1Uncasted as LabwareDefinition2
const opentrons96AluminumblockNestWellplate100UlV1 = opentrons96AluminumblockNestWellplate100UlV1Uncasted as LabwareDefinition2
const opentrons96DeepWellAdapterV1 = opentrons96DeepWellAdapterV1Uncasted as LabwareDefinition2
const opentrons96DeepWellAdapterNestWellplate2MlDeepV1 = opentrons96DeepWellAdapterNestWellplate2MlDeepV1Uncasted as LabwareDefinition2
const opentrons96Filtertiprack1000UlV1 = opentrons96Filtertiprack1000UlV1Uncasted as LabwareDefinition2
const opentrons96Filtertiprack10UlV1 = opentrons96Filtertiprack10UlV1Uncasted as LabwareDefinition2
const opentrons96Filtertiprack200UlV1 = opentrons96Filtertiprack200UlV1Uncasted as LabwareDefinition2
const opentrons96Filtertiprack20UlV1 = opentrons96Filtertiprack20UlV1Uncasted as LabwareDefinition2
const opentrons96FlatBottomAdapterV1 = opentrons96FlatBottomAdapterV1Uncasted as LabwareDefinition2
const opentrons96FlatBottomAdapterNestWellplate200UlFlatV1 = opentrons96FlatBottomAdapterNestWellplate200UlFlatV1Uncasted as LabwareDefinition2
const opentrons96PcrAdapterV1 = opentrons96PcrAdapterV1Uncasted as LabwareDefinition2
const opentrons96PcrAdapterArmadilloWellplate200UlV1 = opentrons96PcrAdapterArmadilloWellplate200UlV1Uncasted as LabwareDefinition2
const opentrons96PcrAdapterNestWellplate100UlPcrFullSkirtV1 = opentrons96PcrAdapterNestWellplate100UlPcrFullSkirtV1Uncasted as LabwareDefinition2
const opentrons96Tiprack1000UlV1 = opentrons96Tiprack1000UlV1Uncasted as LabwareDefinition2
const opentrons96Tiprack10UlV1 = opentrons96Tiprack10UlV1Uncasted as LabwareDefinition2
const opentrons96Tiprack20UlV1 = opentrons96Tiprack20UlV1Uncasted as LabwareDefinition2
const opentrons96Tiprack300UlV1 = opentrons96Tiprack300UlV1Uncasted as LabwareDefinition2
const opentrons96WellAluminumBlockV1 = opentrons96WellAluminumBlockV1Uncasted as LabwareDefinition2
const opentrons96Wellplate200UlPcrFullSkirtV2 = opentrons96Wellplate200UlPcrFullSkirtV2Uncasted as LabwareDefinition2
const opentrons96Wellplate200UlPcrFullSkirtV1 = opentrons96Wellplate200UlPcrFullSkirtV1Uncasted as LabwareDefinition2
const opentrons96DeepWellTempModAdapterV1 = opentrons96DeepWellTempModAdapterV1Uncasted as LabwareDefinition2
const opentronsAluminumFlatBottomPlateV1 = opentronsAluminumFlatBottomPlateV1Uncasted as LabwareDefinition2
const opentronsCalibrationAdapterHeatershakerModuleV1 = opentronsCalibrationAdapterHeatershakerModuleV1Uncasted as LabwareDefinition2
const opentronsCalibrationAdapterTemperatureModuleV1 = opentronsCalibrationAdapterTemperatureModuleV1Uncasted as LabwareDefinition2
const opentronsCalibrationAdapterThermocyclerModuleV1 = opentronsCalibrationAdapterThermocyclerModuleV1Uncasted as LabwareDefinition2
const opentronsCalibrationblockShortSideLeftV1 = opentronsCalibrationblockShortSideLeftV1Uncasted as LabwareDefinition2
const opentronsCalibrationblockShortSideRightV1 = opentronsCalibrationblockShortSideRightV1Uncasted as LabwareDefinition2
const opentronsFlex96Filtertiprack1000UlV1 = opentronsFlex96Filtertiprack1000UlV1Uncasted as LabwareDefinition2
const opentronsFlex96Filtertiprack200UlV1 = opentronsFlex96Filtertiprack200UlV1Uncasted as LabwareDefinition2
const opentronsFlex96Filtertiprack50UlV1 = opentronsFlex96Filtertiprack50UlV1Uncasted as LabwareDefinition2
const opentronsFlex96Tiprack1000UlV1 = opentronsFlex96Tiprack1000UlV1Uncasted as LabwareDefinition2
const opentronsFlex96Tiprack200UlV1 = opentronsFlex96Tiprack200UlV1Uncasted as LabwareDefinition2
const opentronsFlex96Tiprack50UlV1 = opentronsFlex96Tiprack50UlV1Uncasted as LabwareDefinition2
const opentronsFlex96TiprackAdapterV1 = opentronsFlex96TiprackAdapterV1Uncasted as LabwareDefinition2
const opentronsFlexDeckRiserV1 = opentronsFlexDeckRiserV1Uncasted as LabwareDefinition2
const opentronsFlexLidAbsorbancePlateReaderModuleV1 = opentronsFlexLidAbsorbancePlateReaderModuleV1Uncasted as LabwareDefinition2
const opentronsToughPcrAutoSealingLidV1 = opentronsToughPcrAutoSealingLidV1Uncasted as LabwareDefinition2
const opentronsUniversalFlatAdapterV1 = opentronsUniversalFlatAdapterV1Uncasted as LabwareDefinition2
const opentronsUniversalFlatAdapterCorning384Wellplate112UlFlatV1 = opentronsUniversalFlatAdapterCorning384Wellplate112UlFlatV1Uncasted as LabwareDefinition2
const thermoscientificnunc96Wellplate1300UlV1 = thermoscientificnunc96Wellplate1300UlV1Uncasted as LabwareDefinition2
const thermoscientificnunc96Wellplate2000UlV1 = thermoscientificnunc96Wellplate2000UlV1Uncasted as LabwareDefinition2
const tipone96Tiprack200UlV1 = tipone96Tiprack200UlV1Uncasted as LabwareDefinition2
const usascientific12Reservoir22MlV1 = usascientific12Reservoir22MlV1Uncasted as LabwareDefinition2
const usascientific96Wellplate24MlDeepV1 = usascientific96Wellplate24MlDeepV1Uncasted as LabwareDefinition2
const evotipsFlex96TiprackAdapterV1 = evotipsFlex96TiprackAdapterV1Uncasted as LabwareDefinition2
const evotipsOpentrons96LabwareV1 = evotipsOpentrons96LabwareV1Uncasted as LabwareDefinition2

// cast v1 defs

const wellPlate12 = wellPlate12Uncasted as LabwareDefinition1
const vial24Rack = vial24RackUncasted as LabwareDefinition1
const well24Plate = well24PlateUncasted as LabwareDefinition1
const plate384 = plate384Uncasted as LabwareDefinition1
const vialPlate48 = vialPlate48Uncasted as LabwareDefinition1
const wellPlate48 = wellPlate48Uncasted as LabwareDefinition1
const tuberack5Ml3X4 = tuberack5Ml3X4Uncasted as LabwareDefinition1
const wellPlate6 = wellPlate6Uncasted as LabwareDefinition1
const pcr96Flat = pcr96FlatUncasted as LabwareDefinition1
const pcr96PTall = pcr96PTallUncasted as LabwareDefinition1
const deepWell96 = deepWell96Uncasted as LabwareDefinition1
const flat96 = flat96Uncasted as LabwareDefinition1
const wellPlate20Mm96 = wellPlate20Mm96Uncasted as LabwareDefinition1
const maldiPlate = maldiPlateUncasted as LabwareDefinition1
const pcrStripTall = pcrStripTallUncasted as LabwareDefinition1
const t25Flask = t25FlaskUncasted as LabwareDefinition1
const t75Flask = t75FlaskUncasted as LabwareDefinition1
const alumBlockPcrStrips = alumBlockPcrStripsUncasted as LabwareDefinition1
const bioradHardshell96Pcr = bioradHardshell96PcrUncasted as LabwareDefinition1
const eGelgol = eGelgolUncasted as LabwareDefinition1
const fixedTrash = (fixedTrashUncasted as unknown) as LabwareDefinition1
const hampton1MlDeepBlock = hampton1MlDeepBlockUncasted as LabwareDefinition1
const opentronsAluminumBlock2MlEppendorf = opentronsAluminumBlock2MlEppendorfUncasted as LabwareDefinition1
const opentronsAluminumBlock2MlScrewcap = opentronsAluminumBlock2MlScrewcapUncasted as LabwareDefinition1
const opentronsAluminumBlock96PcrPlate = opentronsAluminumBlock96PcrPlateUncasted as LabwareDefinition1
const opentronsAluminumBlockPcrStrips200Ul = opentronsAluminumBlockPcrStrips200UlUncasted as LabwareDefinition1
const opentronsTiprack10Ul = (opentronsTiprack10UlUncasted as unknown) as LabwareDefinition1
const opentronsTiprack300Ul = (opentronsTiprack300UlUncasted as unknown) as LabwareDefinition1
const opentronsTuberack15MlEppendorf = opentronsTuberack15MlEppendorfUncasted as LabwareDefinition1
const opentronsTuberack1550Ml = opentronsTuberack1550MlUncasted as LabwareDefinition1
const opentronsTuberack15Ml = opentronsTuberack15MlUncasted as LabwareDefinition1
const opentronsTuberack2MlEppendorf = opentronsTuberack2MlEppendorfUncasted as LabwareDefinition1
const opentronsTuberack2MlScrewcap = opentronsTuberack2MlScrewcapUncasted as LabwareDefinition1
const opentronsTuberack50Ml = opentronsTuberack50MlUncasted as LabwareDefinition1
const point = pointUncasted as LabwareDefinition1
const rigakuCompactCrystallizationPlate = rigakuCompactCrystallizationPlateUncasted as LabwareDefinition1
const smallVialRack16X45 = smallVialRack16X45Uncasted as LabwareDefinition1
const tallFixedTrash = (tallFixedTrashUncasted as unknown) as LabwareDefinition1
const tiprack1000UlH = (tiprack1000UlHUncasted as unknown) as LabwareDefinition1
const tiprack1000UlChem = (tiprack1000UlChemUncasted as unknown) as LabwareDefinition1
const tiprack1000Ul = (tiprack1000UlUncasted as unknown) as LabwareDefinition1
const tiprack10UlH = (tiprack10UlHUncasted as unknown) as LabwareDefinition1
const tiprack10Ul = (tiprack10UlUncasted as unknown) as LabwareDefinition1
const tiprack200Ul = (tiprack200UlUncasted as unknown) as LabwareDefinition1
const trashBox = (trashBoxUncasted as unknown) as LabwareDefinition1
const trough12RowShort = trough12RowShortUncasted as LabwareDefinition1
const trough12Row = trough12RowUncasted as LabwareDefinition1
const trough1Row25Ml = trough1Row25MlUncasted as LabwareDefinition1
const tubeRack75Ml = tubeRack75MlUncasted as LabwareDefinition1
const tubeRack1550Ml = tubeRack1550MlUncasted as LabwareDefinition1
const tubeRack2Ml9X9 = tubeRack2Ml9X9Uncasted as LabwareDefinition1
const tubeRack2Ml = tubeRack2MlUncasted as LabwareDefinition1
const tubeRack5Ml96 = tubeRack5Ml96Uncasted as LabwareDefinition1
const tubeRack80Well = tubeRack80WellUncasted as LabwareDefinition1
const wheatonVialRack = wheatonVialRackUncasted as LabwareDefinition1

const latestDefs = {
  agilent1Reservoir290MlV1,
  appliedbiosystemsmicroamp384Wellplate40UlV1,
  armadillo96Wellplate200UlPcrFullSkirtV1,
  armadillo96Wellplate200UlPcrFullSkirtV2,
  axygen1Reservoir90MlV1,
  biorad384Wellplate50UlV1,
  biorad384Wellplate50UlV2,
  biorad96Wellplate200UlPcrV1,
  biorad96Wellplate200UlPcrV2,
  corning12Wellplate69MlFlatV1,
  corning12Wellplate69MlFlatV2,
  corning24Wellplate34MlFlatV1,
  corning24Wellplate34MlFlatV2,
  corning384Wellplate112UlFlatV1,
  corning384Wellplate112UlFlatV2,
  corning48Wellplate16MlFlatV1,
  corning48Wellplate16MlFlatV2,
  corning6Wellplate168MlFlatV1,
  corning6Wellplate168MlFlatV2,
  corning96Wellplate360UlFlatV1,
  corning96Wellplate360UlFlatV2,
  eppendorf96Tiprack1000UlEptipsV1,
  eppendorf96Tiprack10UlEptipsV1,
  geb96Tiprack1000UlV1,
  geb96Tiprack10UlV1,
  nest12Reservoir15MlV1,
  nest1Reservoir195MlV1,
  nest1Reservoir195MlV2,
  nest1Reservoir290MlV1,
  nest96Wellplate100UlPcrFullSkirtV1,
  nest96Wellplate100UlPcrFullSkirtV2,
  nest96Wellplate200UlFlatV1,
  nest96Wellplate200UlFlatV2,
  nest96Wellplate2MlDeepV1,
  nest96Wellplate2MlDeepV2,
  opentrons10TuberackFalcon4X50Ml6X15MlConicalV1,
  opentrons10TuberackFalcon4X50Ml6X15MlConicalAcrylicV1,
  opentrons10TuberackNest4X50Ml6X15MlConicalV1,
  opentrons15TuberackFalcon15MlConicalV1,
  opentrons15TuberackNest15MlConicalV1,
  opentrons1Trash3200MlFixedV1,
  opentrons1Trash1100MlFixedV1,
  opentrons1Trash850MlFixedV1,
  opentrons24AluminumblockGeneric2MlScrewcapV1,
  opentrons24AluminumblockGeneric2MlScrewcapV2,
  opentrons24AluminumblockNest05MlScrewcapV1,
  opentrons24AluminumblockNest15MlScrewcapV1,
  opentrons24AluminumblockNest15MlSnapcapV1,
  opentrons24AluminumblockNest2MlScrewcapV1,
  opentrons24AluminumblockNest2MlSnapcapV1,
  opentrons24TuberackEppendorf15MlSafelockSnapcapV1,
  opentrons24TuberackEppendorf2MlSafelockSnapcapV1,
  opentrons24TuberackEppendorf2MlSafelockSnapcapAcrylicV1,
  opentrons24TuberackGeneric075MlSnapcapAcrylicV1,
  opentrons24TuberackGeneric2MlScrewcapV1,
  opentrons24TuberackNest05MlScrewcapV1,
  opentrons24TuberackNest15MlScrewcapV1,
  opentrons24TuberackNest15MlSnapcapV1,
  opentrons24TuberackNest2MlScrewcapV1,
  opentrons24TuberackNest2MlSnapcapV1,
  opentrons40AluminumblockEppendorf24X2MlSafelockSnapcapGeneric16X02MlPcrStripV1,
  opentrons6TuberackFalcon50MlConicalV1,
  opentrons6TuberackNest50MlConicalV1,
  opentrons96DeepWellTempModAdapterV1,
  opentrons96AluminumblockBioradWellplate200UlV1,
  opentrons96AluminumblockGenericPcrStrip200UlV1,
  opentrons96AluminumblockGenericPcrStrip200UlV2,
  opentrons96AluminumblockNestWellplate100UlV1,
  opentrons96DeepWellAdapterV1,
  opentrons96DeepWellAdapterNestWellplate2MlDeepV1,
  opentrons96Filtertiprack1000UlV1,
  opentrons96Filtertiprack10UlV1,
  opentrons96Filtertiprack200UlV1,
  opentrons96Filtertiprack20UlV1,
  opentrons96FlatBottomAdapterV1,
  opentrons96FlatBottomAdapterNestWellplate200UlFlatV1,
  opentrons96PcrAdapterV1,
  opentrons96PcrAdapterArmadilloWellplate200UlV1,
  opentrons96PcrAdapterNestWellplate100UlPcrFullSkirtV1,
  opentrons96Tiprack1000UlV1,
  opentrons96Tiprack10UlV1,
  opentrons96Tiprack20UlV1,
  opentrons96Tiprack300UlV1,
  opentrons96WellAluminumBlockV1,
  opentrons96Wellplate200UlPcrFullSkirtV1,
  opentrons96Wellplate200UlPcrFullSkirtV2,
  opentronsAluminumFlatBottomPlateV1,
  opentronsCalibrationAdapterHeatershakerModuleV1,
  opentronsCalibrationAdapterTemperatureModuleV1,
  opentronsCalibrationAdapterThermocyclerModuleV1,
  opentronsCalibrationblockShortSideLeftV1,
  opentronsCalibrationblockShortSideRightV1,
  opentronsFlex96Filtertiprack1000UlV1,
  opentronsFlex96Filtertiprack200UlV1,
  opentronsFlex96Filtertiprack50UlV1,
  opentronsFlex96Tiprack1000UlV1,
  opentronsFlex96Tiprack200UlV1,
  opentronsFlex96Tiprack50UlV1,
  opentronsFlex96TiprackAdapterV1,
  opentronsFlexDeckRiserV1,
  opentronsFlexLidAbsorbancePlateReaderModuleV1,
  opentronsToughPcrAutoSealingLidV1,
  opentronsUniversalFlatAdapterV1,
  opentronsUniversalFlatAdapterCorning384Wellplate112UlFlatV1,
  thermoscientificnunc96Wellplate1300UlV1,
  thermoscientificnunc96Wellplate2000UlV1,
  tipone96Tiprack200UlV1,
  usascientific12Reservoir22MlV1,
  usascientific96Wellplate24MlDeepV1,
  evotipsFlex96TiprackAdapterV1,
  evotipsOpentrons96LabwareV1,
}
// labware definitions
const getAllLabwareDefs = (): Record<
  keyof typeof latestDefs,
  LabwareDefinition2
> => latestDefs

const getAllLegacyDefs = (): Record<string, LabwareDefinition1> => ({
  wellPlate12,
  vial24Rack,
  well24Plate,
  plate384,
  vialPlate48,
  wellPlate48,
  tuberack5Ml3X4,
  wellPlate6,
  pcr96Flat,
  pcr96PTall,
  deepWell96,
  flat96,
  wellPlate20Mm96,
  maldiPlate,
  pcrStripTall,
  t25Flask,
  t75Flask,
  alumBlockPcrStrips,
  bioradHardshell96Pcr,
  eGelgol,
  fixedTrash,
  hampton1MlDeepBlock,
  opentronsAluminumBlock2MlEppendorf,
  opentronsAluminumBlock2MlScrewcap,
  opentronsAluminumBlock96PcrPlate,
  opentronsAluminumBlockPcrStrips200Ul,
  opentronsTiprack10Ul,
  opentronsTiprack300Ul,
  opentronsTuberack15MlEppendorf,
  opentronsTuberack1550Ml,
  opentronsTuberack15Ml,
  opentronsTuberack2MlEppendorf,
  opentronsTuberack2MlScrewcap,
  opentronsTuberack50Ml,
  point,
  rigakuCompactCrystallizationPlate,
  smallVialRack16X45,
  tallFixedTrash,
  tiprack1000UlH,
  tiprack1000UlChem,
  tiprack1000Ul,
  tiprack10UlH,
  tiprack10Ul,
  tiprack200Ul,
  trashBox,
  trough12RowShort,
  trough12Row,
  trough1Row25Ml,
  tubeRack75Ml,
  tubeRack1550Ml,
  tubeRack2Ml9X9,
  tubeRack2Ml,
  tubeRack5Ml96,
  tubeRack80Well,
  wheatonVialRack,
})

let _definitions: LabwareDefByDefURI | null = null
let _legacyDefinitions: LegacyLabwareDefByName | null = null
export function getAllDefinitions(
  blockList: string[] = []
): LabwareDefByDefURI {
  if (_definitions == null) {
    _definitions = Object.values(
      getAllLabwareDefs()
    ).reduce<LabwareDefByDefURI>((acc, labwareDef: LabwareDefinition2) => {
      const labwareDefURI = getLabwareDefURI(labwareDef)
      return blockList.includes(labwareDef.parameters.loadName)
        ? acc
        : { ...acc, [labwareDefURI]: labwareDef }
    }, {})
  }

  return _definitions
}

export function getAllLegacyDefinitions(): LegacyLabwareDefByName {
  if (_legacyDefinitions == null) {
    _legacyDefinitions = Object.values(
      getAllLegacyDefs()
    ).reduce<LegacyLabwareDefByName>((acc, labwareDef: LabwareDefinition1) => {
      return { ...acc, [labwareDef.metadata.name]: labwareDef }
    }, {})
  }
  return _legacyDefinitions
}

export {
  labwareSchemaV2,
  fixture96Plate,
  fixture12Trough,
  fixture24Tuberack,
  fixtureTiprack10ul,
  fixtureTiprack300ul,
  fixtureTiprack1000ul,
  fixtureTiprackAdapter,
  opentrons96PcrAdapterV1,
  opentrons1Trash3200MlFixedV1,
  fixtureTrash,
  fixture384Plate,
  fixtureCalibrationBlock,
  opentrons96Tiprack10UlV1Uncasted,
}

export { getAllLabwareDefs }
