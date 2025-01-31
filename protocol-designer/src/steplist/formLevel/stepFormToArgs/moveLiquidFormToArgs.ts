import { getWellsDepth } from '@opentrons/shared-data'
import { DEST_WELL_BLOWOUT_DESTINATION } from '@opentrons/step-generation'
import {
  DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
  DEFAULT_MM_FROM_BOTTOM_DISPENSE,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
} from '../../../constants'
import { getOrderedWells } from '../../utils'
import { getMoveLiquidDelayData } from './getDelayData'
import { getMatchingTipLiquidSpecs } from '../../../utils'
import type {
  ConsolidateArgs,
  DistributeArgs,
  TransferArgs,
  InnerMixArgs,
} from '@opentrons/step-generation'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { HydratedMoveLiquidFormData } from '../../../form-types'
type MoveLiquidFields = HydratedMoveLiquidFormData['fields']

// NOTE(sa, 2020-08-11): leaving this as fn so it can be expanded later for dispense air gap
export function getAirGapData(
  hydratedFormData: MoveLiquidFields,
  checkboxField: 'aspirate_airGap_checkbox' | 'dispense_airGap_checkbox',
  volumeField: 'aspirate_airGap_volume' | 'dispense_airGap_volume'
): number | null {
  const checkbox = hydratedFormData[checkboxField]
  const volume = hydratedFormData[volumeField]

  if (checkbox && typeof volume === 'number' && volume > 0) {
    return volume
  }

  return null
}
export function getMixData(
  hydratedFormData: any,
  checkboxField: any,
  volumeField: any,
  timesField: any
): InnerMixArgs | null | undefined {
  const checkbox = hydratedFormData[checkboxField]
  const volume = hydratedFormData[volumeField]
  const times = hydratedFormData[timesField]

  if (
    checkbox &&
    typeof volume === 'number' &&
    volume > 0 &&
    typeof times === 'number' &&
    times > 0
  ) {
    return {
      volume,
      times,
    }
  }

  return null
}
type MoveLiquidStepArgs = ConsolidateArgs | DistributeArgs | TransferArgs | null
export const moveLiquidFormToArgs = (
  hydratedFormData: HydratedMoveLiquidFormData
): MoveLiquidStepArgs => {
  console.assert(
    hydratedFormData.stepType === 'moveLiquid',
    `moveLiquidFormToArgs called with stepType ${hydratedFormData.stepType}, expected "moveLiquid"`
  )
  const fields = hydratedFormData.fields
  const pipetteId = fields.pipette.id
  const {
    volume,
    aspirate_labware: sourceLabware,
    dispense_labware: destLabware,
    aspirate_wells: sourceWellsUnordered,
    dispense_wells: destWellsUnordered,
    dropTip_location: dropTipLocation,
    path,
    tipRack,
    nozzles,
    aspirate_x_position,
    dispense_x_position,
    aspirate_y_position,
    dispense_y_position,
    blowout_z_offset,
  } = fields
  let sourceWells = getOrderedWells(
    fields.aspirate_wells,
    sourceLabware.def,
    fields.aspirate_wellOrder_first,
    fields.aspirate_wellOrder_second
  )

  const isDispensingIntoDisposalLocation =
    'name' in destLabware &&
    (destLabware.name === 'wasteChute' || destLabware.name === 'trashBin')

  let def: LabwareDefinition2 | null = null
  let dispWells: string[] = []

  if ('def' in destLabware) {
    def = destLabware.def
    dispWells = destWellsUnordered
  }
  let destWells =
    !isDispensingIntoDisposalLocation && def != null
      ? getOrderedWells(
          dispWells,
          def,
          fields.dispense_wellOrder_first,
          fields.dispense_wellOrder_second
        )
      : null

  // 1:many with single path: spread well array of length 1 to match other well array
  // distribute 1:many can not happen into the waste chute or trash bin
  if (destWells != null && !isDispensingIntoDisposalLocation) {
    if (path === 'single' && sourceWells.length !== destWells.length) {
      if (sourceWells.length === 1) {
        sourceWells = Array(destWells.length).fill(sourceWells[0])
      } else if (destWells.length === 1) {
        destWells = Array(sourceWells.length).fill(destWells[0])
      }
    }
  }
  const wellDepth =
    'def' in destLabware && destWells != null
      ? getWellsDepth(destLabware.def, destWells)
      : 0

  const disposalVolume = fields.disposalVolume_checkbox
    ? fields.disposalVolume_volume
    : null
  const touchTipAfterAspirate = Boolean(fields.aspirate_touchTip_checkbox)
  const touchTipAfterAspirateOffsetMmFromBottom =
    fields.aspirate_touchTip_mmFromBottom ||
    getWellsDepth(fields.aspirate_labware.def, sourceWells) +
      DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP
  const touchTipAfterDispense = Boolean(fields.dispense_touchTip_checkbox)
  const touchTipAfterDispenseOffsetMmFromBottom =
    fields.dispense_touchTip_mmFromBottom ||
    wellDepth + DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP
  const mixBeforeAspirate = getMixData(
    fields,
    'aspirate_mix_checkbox',
    'aspirate_mix_volume',
    'aspirate_mix_times'
  )
  const mixInDestination = getMixData(
    fields,
    'dispense_mix_checkbox',
    'dispense_mix_volume',
    'dispense_mix_times'
  )
  const aspirateDelay = getMoveLiquidDelayData(
    fields,
    'aspirate_delay_checkbox',
    'aspirate_delay_seconds',
    'aspirate_delay_mmFromBottom'
  )
  const dispenseDelay = getMoveLiquidDelayData(
    fields,
    'dispense_delay_checkbox',
    'dispense_delay_seconds',
    'dispense_delay_mmFromBottom'
  )
  const blowoutLocation =
    (fields.blowout_checkbox && fields.blowout_location) ||
    (fields.disposalVolume_checkbox &&
      path === 'multiDispense' &&
      fields.disposalVolume_volume &&
      fields.blowout_location) ||
    null

  const blowoutOffsetFromTopMm =
    blowoutLocation != null
      ? blowout_z_offset ?? DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP
      : DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP
  const aspirateAirGapVolume = getAirGapData(
    fields,
    'aspirate_airGap_checkbox',
    'aspirate_airGap_volume'
  )
  const dispenseAirGapVolume = getAirGapData(
    fields,
    'dispense_airGap_checkbox',
    'dispense_airGap_volume'
  )
  const matchingTipLiquidSpecs = getMatchingTipLiquidSpecs(
    fields.pipette,
    fields.volume,
    tipRack
  )
  const commonFields = {
    pipette: pipetteId,
    volume,
    sourceLabware: sourceLabware.id,
    destLabware: destLabware.id,
    tipRack: tipRack,
    aspirateFlowRateUlSec:
      fields.aspirate_flowRate ||
      matchingTipLiquidSpecs.defaultAspirateFlowRate.default,
    dispenseFlowRateUlSec:
      fields.dispense_flowRate ||
      matchingTipLiquidSpecs.defaultDispenseFlowRate.default,
    aspirateOffsetFromBottomMm:
      fields.aspirate_mmFromBottom || DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
    dispenseOffsetFromBottomMm:
      fields.dispense_mmFromBottom || DEFAULT_MM_FROM_BOTTOM_DISPENSE,
    blowoutFlowRateUlSec:
      fields.blowout_flowRate ||
      matchingTipLiquidSpecs.defaultBlowOutFlowRate.default,
    blowoutOffsetFromTopMm,
    changeTip: fields.changeTip,
    preWetTip: Boolean(fields.preWetTip),
    aspirateDelay,
    dispenseDelay,
    aspirateAirGapVolume,
    dispenseAirGapVolume,
    touchTipAfterAspirate,
    touchTipAfterAspirateOffsetMmFromBottom,
    touchTipAfterDispense,
    touchTipAfterDispenseOffsetMmFromBottom,
    description: hydratedFormData.description,
    name: hydratedFormData.stepName,
    //  TODO(jr, 7/26/24): wire up wellNames
    dropTipLocation,
    nozzles,
    aspirateXOffset: aspirate_x_position ?? 0,
    aspirateYOffset: aspirate_y_position ?? 0,
    dispenseXOffset: dispense_x_position ?? 0,
    dispenseYOffset: dispense_y_position ?? 0,
  }
  console.assert(
    sourceWellsUnordered.length > 0,
    'expected sourceWells to have length > 0'
  )
  console.assert(
    !(
      path === 'multiDispense' &&
      blowoutLocation === DEST_WELL_BLOWOUT_DESTINATION
    ),
    'blowout location for multiDispense cannot be destination well'
  )

  if (!isDispensingIntoDisposalLocation && dispWells.length === 0) {
    console.error('expected to have destWells.length > 0 but got none')
  }

  console.assert(
    !(path === 'multiDispense' && destWells == null),
    'cannot distribute when destWells is null'
  )

  switch (path) {
    case 'single': {
      const transferStepArguments: TransferArgs = {
        ...commonFields,
        commandCreatorFnName: 'transfer',
        blowoutLocation,
        sourceWells,
        destWells,
        mixBeforeAspirate,
        mixInDestination,
      }
      return transferStepArguments
    }

    case 'multiAspirate': {
      const consolidateStepArguments: ConsolidateArgs = {
        ...commonFields,
        commandCreatorFnName: 'consolidate',
        blowoutLocation,
        mixFirstAspirate: mixBeforeAspirate,
        mixInDestination,
        sourceWells,
        destWell: destWells != null ? destWells[0] : null,
      }
      return consolidateStepArguments
    }

    case 'multiDispense': {
      const distributeStepArguments: DistributeArgs = {
        ...commonFields,
        commandCreatorFnName: 'distribute',
        disposalVolume,
        // distribute needs blowout location field because disposal volume checkbox might be checked without blowout checkbox being checked
        blowoutLocation: fields.blowout_location,
        mixBeforeAspirate,
        sourceWell: sourceWells[0],
        // cannot distribute into a waste chute so if destWells is null
        // there is an error
        destWells: destWells ?? [],
      }
      return distributeStepArguments
    }

    default: {
      console.assert(
        false,
        `moveLiquidFormToArgs got unexpected "path" field value: ${path}`
      )
      return null
    }
  }
}
