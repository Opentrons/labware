import {
  DEFAULT_CHANGE_TIP_OPTION,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
  DEFAULT_MM_OFFSET_FROM_BOTTOM,
} from '../../../constants'
import { getOrderedWells } from '../../utils'
import { getMixDelayData } from './getDelayData'
import { getMatchingTipLiquidSpecs } from '../../../utils'
import type { HydratedMixFormData } from '../../../form-types'
import type { MixArgs } from '@opentrons/step-generation'
type MixStepArgs = MixArgs
export const mixFormToArgs = (
  hydratedFormData: HydratedMixFormData
): MixStepArgs => {
  const {
    labware,
    pipette,
    dropTip_location,
    nozzles,
    mix_x_position,
    mix_y_position,
    blowout_z_offset,
  } = hydratedFormData
  const matchingTipLiquidSpecs = getMatchingTipLiquidSpecs(
    pipette,
    hydratedFormData.volume,
    hydratedFormData.tipRack
  )
  const unorderedWells = hydratedFormData.wells || []
  const orderFirst = hydratedFormData.mix_wellOrder_first
  const orderSecond = hydratedFormData.mix_wellOrder_second
  const orderedWells = getOrderedWells(
    unorderedWells,
    labware.def,
    orderFirst,
    orderSecond
  )
  const touchTip = Boolean(hydratedFormData.mix_touchTip_checkbox)
  const touchTipMmFromTop =
    hydratedFormData.mix_touchTip_mmFromTop ??
    DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP
  const volume = hydratedFormData.volume || 0
  const times = hydratedFormData.times || 0
  const aspirateFlowRateUlSec =
    hydratedFormData.aspirate_flowRate ||
    matchingTipLiquidSpecs?.defaultAspirateFlowRate.default
  const dispenseFlowRateUlSec =
    hydratedFormData.dispense_flowRate ||
    matchingTipLiquidSpecs?.defaultDispenseFlowRate.default

  const offsetFromBottomMm =
    hydratedFormData.mix_mmFromBottom || DEFAULT_MM_OFFSET_FROM_BOTTOM
  // It's radiobutton, so one should always be selected.
  // One changeTip option should always be selected.
  console.assert(
    hydratedFormData.changeTip,
    'mixFormToArgs expected non-falsey changeTip option'
  )
  const changeTip = hydratedFormData.changeTip || DEFAULT_CHANGE_TIP_OPTION
  const blowoutLocation = hydratedFormData.blowout_checkbox
    ? hydratedFormData.blowout_location
    : null
  // Blowout settings
  const blowoutFlowRateUlSec =
    hydratedFormData.blowout_flowRate ??
    matchingTipLiquidSpecs?.defaultBlowOutFlowRate.default

  const blowoutOffsetFromTopMm = blowoutLocation
    ? blowout_z_offset ?? DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP
    : 0
  // Delay settings
  const aspirateDelaySeconds = getMixDelayData(
    hydratedFormData,
    'aspirate_delay_checkbox',
    'aspirate_delay_seconds'
  )
  const dispenseDelaySeconds = getMixDelayData(
    hydratedFormData,
    'dispense_delay_checkbox',
    'dispense_delay_seconds'
  )
  return {
    commandCreatorFnName: 'mix',
    name: hydratedFormData.stepName,
    description: hydratedFormData.stepDetails,
    labware: labware.id,
    wells: orderedWells,
    volume,
    times,
    touchTip,
    touchTipMmFromTop,
    changeTip,
    blowoutLocation,
    pipette: pipette.id,
    aspirateFlowRateUlSec: aspirateFlowRateUlSec ?? 0,
    dispenseFlowRateUlSec: dispenseFlowRateUlSec ?? 0,
    blowoutFlowRateUlSec: blowoutFlowRateUlSec ?? 0,
    offsetFromBottomMm,
    blowoutOffsetFromTopMm,
    aspirateDelaySeconds,
    tipRack: hydratedFormData.tipRack,
    dispenseDelaySeconds,
    //  TODO(jr, 7/26/24): wire up wellNames
    dropTipLocation: dropTip_location,
    nozzles,
    xOffset: mix_x_position ?? 0,
    yOffset: mix_y_position ?? 0,
  }
}
