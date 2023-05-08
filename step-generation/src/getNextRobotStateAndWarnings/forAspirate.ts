import assert from 'assert'
import range from 'lodash/range'
import isEmpty from 'lodash/isEmpty'
import uniq from 'lodash/uniq'
import {
  AIR,
  mergeLiquid,
  splitLiquid,
  getWellsForTips,
  getLocationTotalVolume,
} from '../utils/misc'
import * as warningCreators from '../warningCreators'
import type { AspDispAirgapParams } from '@opentrons/shared-data/protocol/types/schemaV6/command/pipetting'
import type { InvariantContext, RobotStateAndWarnings } from '../types'
export function forAspirate(
  params: AspDispAirgapParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void {
  const { pipetteId, volume, labwareId } = params
  const { robotState, warnings } = robotStateAndWarnings
  const { liquidState } = robotState
  const pipetteSpec = invariantContext.pipetteEntities[pipetteId].spec
  const labwareDef = invariantContext.labwareEntities[labwareId].def
  const { allWellsShared, wellsForTips } = getWellsForTips(
    // @ts-expect-error 96 channels not yet supported
    pipetteSpec.channels,
    labwareDef,
    params.wellName
  )
  assert(
    // @ts-expect-error (sa, 2021-05-03): this assert is unnecessary
    uniq(wellsForTips).length === allWellsShared ? 1 : wellsForTips.length,
    `expected all wells to be shared, or no wells to be shared. Got: ${JSON.stringify(
      wellsForTips
    )}`
  )

  if (pipetteSpec.channels > 1 && allWellsShared) {
    // special case: trough-like "shared" well with multi-channel pipette
    const commonWell = wellsForTips[0]
    const sourceLiquidState = liquidState.labware[labwareId][commonWell]
    const isOveraspirate =
      volume * pipetteSpec.channels > getLocationTotalVolume(sourceLiquidState)

    if (isEmpty(sourceLiquidState)) {
      warnings.push(warningCreators.aspirateFromPristineWell())
    } else if (isOveraspirate) {
      warnings.push(warningCreators.aspirateMoreThanWellContents())
    }

    const volumePerTip = isOveraspirate
      ? getLocationTotalVolume(sourceLiquidState) / pipetteSpec.channels
      : volume
    // all tips get the same amount of the same liquid added to them, from the source well
    const newLiquidFromWell = splitLiquid(volumePerTip, sourceLiquidState).dest
    range(pipetteSpec.channels).forEach((tipIndex): void => {
      const pipette = liquidState.pipettes[pipetteId]
      const indexToString = tipIndex.toString()
      const tipLiquidState = pipette[indexToString]
      // since volumePerTip is being calculated to avoid splitting unevenly across tips,
      // AIR needs to be added in here if it's an over-aspiration
      const nextTipLiquidState = isOveraspirate
        ? mergeLiquid(tipLiquidState, {
            ...newLiquidFromWell,
            [AIR]: {
              volume: volume - volumePerTip,
            },
          })
        : mergeLiquid(tipLiquidState, newLiquidFromWell)
      pipette[indexToString] = nextTipLiquidState
    })
    // Remove liquid from source well
    liquidState.labware[labwareId][commonWell] = splitLiquid(
      volume * pipetteSpec.channels,
      liquidState.labware[labwareId][commonWell]
    ).source
    return
  }

  // general case (no common well shared across all tips)
  range(pipetteSpec.channels).forEach(tipIndex => {
    const indexToString = tipIndex.toString()
    const pipette = liquidState.pipettes[pipetteId]
    const tipLiquidState = pipette[indexToString]
    const sourceLiquidState =
      liquidState.labware[labwareId][wellsForTips[tipIndex]]
    const newLiquidFromWell = splitLiquid(volume, sourceLiquidState).dest

    if (isEmpty(sourceLiquidState)) {
      warnings.push(warningCreators.aspirateFromPristineWell())
    } else if (volume > getLocationTotalVolume(sourceLiquidState)) {
      warnings.push(warningCreators.aspirateMoreThanWellContents())
    }

    pipette[indexToString] = mergeLiquid(tipLiquidState, newLiquidFromWell)
  })
  // Remove liquid from source well(s)
  const labwareLiquidState = liquidState.labware[labwareId]
  wellsForTips.forEach(well => {
    labwareLiquidState[well] = splitLiquid(
      volume,
      labwareLiquidState[well]
    ).source
  })
}
