import { expect } from 'vitest'
import {
  tiprackWellNamesFlat,
  DEFAULT_PIPETTE,
  SOURCE_LABWARE,
  DEFAULT_BLOWOUT_WELL,
  DEST_LABWARE,
} from './data'
import { ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA } from '@opentrons/shared-data'

import type {
  AddressableAreaName,
  AspDispAirgapParams,
  BlowoutParams,
  CreateCommand,
  TouchTipParams,
} from '@opentrons/shared-data'
import type { CommandsAndWarnings, CommandCreatorErrorResponse } from '../types'

/** Used to wrap command creators in tests, effectively casting their results
 **  to normal response or error response
 **/
export function getSuccessResult(
  result: CommandsAndWarnings | CommandCreatorErrorResponse
): CommandsAndWarnings {
  if ('errors' in result) {
    throw new Error(
      `Expected a successful command creator call but got errors: ${JSON.stringify(
        result.errors
      )}`
    )
  }

  return result
}
export function getErrorResult(
  result: CommandsAndWarnings | CommandCreatorErrorResponse
): CommandCreatorErrorResponse {
  if (!('errors' in result)) {
    throw new Error(
      `Expected command creator to return errors but got success result`
    )
  }

  return result
}
export const replaceTipCommands = (tip: number | string): CreateCommand[] => [
  ...dropTipHelper(),
  pickUpTipHelper(tip),
]
// NOTE: make sure none of these numbers match each other!
const ASPIRATE_FLOW_RATE = 2.1
const DISPENSE_FLOW_RATE = 2.2
export const BLOWOUT_FLOW_RATE = 2.3
export const ASPIRATE_OFFSET_FROM_BOTTOM_MM = 3.1
export const DISPENSE_OFFSET_FROM_BOTTOM_MM = 3.2
export const BLOWOUT_OFFSET_FROM_TOP_MM = 3.3
const TOUCH_TIP_OFFSET_FROM_TOP_MM = -3.4
interface FlowRateAndOffsetParamsTransferlike {
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  blowoutFlowRateUlSec: number
  aspirateOffsetFromBottomMm: number
  dispenseOffsetFromBottomMm: number
  blowoutOffsetFromTopMm: number
  touchTipAfterAspirateOffsetMmFromTop: number
  touchTipAfterDispenseOffsetMmFromTop: number
}
export const getFlowRateAndOffsetParamsTransferLike = (): FlowRateAndOffsetParamsTransferlike => ({
  aspirateFlowRateUlSec: ASPIRATE_FLOW_RATE,
  dispenseFlowRateUlSec: DISPENSE_FLOW_RATE,
  blowoutFlowRateUlSec: BLOWOUT_FLOW_RATE,
  aspirateOffsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
  dispenseOffsetFromBottomMm: DISPENSE_OFFSET_FROM_BOTTOM_MM,
  blowoutOffsetFromTopMm: BLOWOUT_OFFSET_FROM_TOP_MM,
  // for consolidate/distribute/transfer only
  touchTipAfterAspirateOffsetMmFromTop: TOUCH_TIP_OFFSET_FROM_TOP_MM,
  touchTipAfterDispenseOffsetMmFromTop: TOUCH_TIP_OFFSET_FROM_TOP_MM,
})
interface FlowRateAndOffsetParamsMix {
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  blowoutFlowRateUlSec: number
  aspirateOffsetFromBottomMm: number
  dispenseOffsetFromBottomMm: number
  blowoutOffsetFromTopMm: number
  touchTipMmFromTop: number
}
export const getFlowRateAndOffsetParamsMix = (): FlowRateAndOffsetParamsMix => ({
  aspirateFlowRateUlSec: ASPIRATE_FLOW_RATE,
  dispenseFlowRateUlSec: DISPENSE_FLOW_RATE,
  blowoutFlowRateUlSec: BLOWOUT_FLOW_RATE,
  aspirateOffsetFromBottomMm: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
  dispenseOffsetFromBottomMm: DISPENSE_OFFSET_FROM_BOTTOM_MM,
  blowoutOffsetFromTopMm: BLOWOUT_OFFSET_FROM_TOP_MM,
  // for mix only
  touchTipMmFromTop: TOUCH_TIP_OFFSET_FROM_TOP_MM,
})
type MakeAspDispHelper<P> = (
  bakedParams?: Partial<P>
) => (well: string, volume: number, params?: Partial<P>) => CreateCommand
type MakeAirGapHelper<P> = (
  bakedParams: Partial<P> & {
    wellLocation: {
      origin: 'bottom'
      offset: {
        z: number
      }
    }
  }
) => (well: string, volume: number, params?: Partial<P>) => CreateCommand
type MakeDispenseAirGapHelper<P> = MakeAirGapHelper<P>
const _defaultAspirateParams = {
  pipetteId: DEFAULT_PIPETTE,
  labwareId: SOURCE_LABWARE,
}
export const makeAspirateHelper: MakeAspDispHelper<AspDispAirgapParams> = bakedParams => (
  wellName,
  volume,
  params
) => ({
  commandType: 'aspirate',
  key: expect.any(String),
  params: {
    ..._defaultAspirateParams,
    ...bakedParams,
    wellName,
    volume,
    wellLocation: {
      origin: 'bottom',
      offset: {
        y: 0,
        x: 0,
        z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
      },
    },
    flowRate: ASPIRATE_FLOW_RATE,
    ...params,
  },
})
export const makeMoveToWellHelper = (wellName: string, labwareId?: string) => ({
  commandType: 'moveToWell',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    labwareId: labwareId ?? SOURCE_LABWARE,
    wellName,
    wellLocation: {
      origin: 'bottom',
      offset: {
        x: 0,
        y: 0,
        z: 11.54,
      },
    },
  },
})
export const makeAirGapHelper = (volume: number) => ({
  commandType: 'airGapInPlace',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    volume,
    flowRate: ASPIRATE_FLOW_RATE,
  },
})
export const blowoutHelper = (
  labware: string,
  params?: Partial<BlowoutParams>
): CreateCommand => ({
  commandType: 'blowout',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    labwareId: labware,
    wellName: DEFAULT_BLOWOUT_WELL,
    wellLocation: {
      origin: 'bottom',
      offset: {
        z: BLOWOUT_OFFSET_FROM_TOP_MM,
      },
    },
    // TODO IMMEDIATELY
    flowRate: BLOWOUT_FLOW_RATE,
    ...params,
  },
})
export const blowoutInPlaceHelper = (): CreateCommand[] => [
  {
    commandType: 'moveToAddressableArea',
    key: expect.any(String),
    params: {
      pipetteId: 'p300SingleId',
      addressableAreaName: 'movableTrashA3',
      offset: { x: 0, y: 0, z: 0 },
    },
  },
  {
    commandType: 'blowOutInPlace',
    key: expect.any(String),
    params: {
      pipetteId: 'p300SingleId',
      flowRate: 2.3,
    },
  },
]
const _defaultDispenseParams = {
  pipetteId: DEFAULT_PIPETTE,
  labwareId: DEST_LABWARE,
  wellLocation: {
    origin: 'bottom' as const,
    offset: {
      y: 0,
      x: 0,
      z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
    },
  },
  flowRate: DISPENSE_FLOW_RATE,
}
export const makeDispenseHelper: MakeAspDispHelper<AspDispAirgapParams> = bakedParams => (
  wellName,
  volume,
  params
) => ({
  commandType: 'dispense',
  key: expect.any(String),
  params: {
    ..._defaultDispenseParams,
    ...bakedParams,
    wellName,
    volume,
    ...params,
  },
})
export const makeDispenseAirGapHelper: MakeDispenseAirGapHelper<AspDispAirgapParams> = bakedParams => (
  wellName,
  volume,
  params
) => ({
  commandType: 'dispense',
  key: expect.any(String),
  params: {
    ..._defaultDispenseParams,
    ...bakedParams,
    wellName,
    volume,
    ...params,
  },
})
const _defaultTouchTipParams = {
  pipetteId: DEFAULT_PIPETTE,
  labwareId: SOURCE_LABWARE,
  wellLocation: {
    origin: 'top' as const,
    offset: {
      z: TOUCH_TIP_OFFSET_FROM_TOP_MM,
    },
  },
}
type MakeTouchTipHelper = (
  bakedParams?: Partial<TouchTipParams>
) => (wellName: string, params?: Partial<TouchTipParams>) => CreateCommand
export const makeTouchTipHelper: MakeTouchTipHelper = bakedParams => (
  wellName,
  params
) => ({
  commandType: 'touchTip',
  key: expect.any(String),
  params: { ..._defaultTouchTipParams, ...bakedParams, wellName, ...params },
})
export const delayCommand = (seconds: number): CreateCommand => ({
  commandType: 'waitForDuration',
  key: expect.any(String),
  params: {
    seconds: seconds,
  },
})
export const delayWithOffset = (
  wellName: string,
  labwareId: string,
  seconds?: number,
  zOffset?: number
): CreateCommand[] => [
  {
    commandType: 'moveToWell',
    key: expect.any(String),
    params: {
      pipetteId: DEFAULT_PIPETTE,
      labwareId,
      wellName,
      wellLocation: {
        origin: 'bottom',
        offset: {
          x: 0,
          y: 0,
          z: zOffset || 14,
        },
      },
    },
  },
  {
    commandType: 'waitForDuration',
    key: expect.any(String),
    params: {
      seconds: seconds ?? 12,
    },
  },
]
// =================
export const dropTipHelper = (pipette?: string): CreateCommand[] => [
  {
    commandType: 'moveToAddressableAreaForDropTip',
    key: expect.any(String),
    params: {
      pipetteId: pipette ?? DEFAULT_PIPETTE,
      addressableAreaName: 'movableTrashA3',
      offset: { x: 0, y: 0, z: 0 },
      alternateDropLocation: true,
    },
  },
  {
    commandType: 'dropTipInPlace',
    key: expect.any(String),
    params: {
      pipetteId: pipette ?? DEFAULT_PIPETTE,
    },
  },
]
export const dropTipIntoWasteChuteHelper = (
  pipette?: string
): CreateCommand[] => [
  {
    commandType: 'moveToAddressableArea',
    key: expect.any(String),
    params: {
      pipetteId: pipette ?? DEFAULT_PIPETTE,
      addressableAreaName: 'movableTrashA3',
      offset: { x: 0, y: 0, z: 0 },
    },
  },
  {
    commandType: 'dropTipInPlace',
    key: expect.any(String),
    params: {
      pipetteId: pipette ?? DEFAULT_PIPETTE,
    },
  },
]
export const pickUpTipHelper = (
  tip: number | string,
  params?: {
    pipetteId?: string
    labwareId?: string
  }
): CreateCommand => ({
  commandType: 'pickUpTip',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    labwareId: 'tiprack1Id',
    ...params,
    wellName: typeof tip === 'string' ? tip : tiprackWellNamesFlat[tip],
  },
})
export const dropTipInPlaceHelper = (params?: {
  pipetteId?: string
}): CreateCommand => ({
  commandType: 'dropTipInPlace',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    ...params,
  },
})
export const moveToAddressableAreaHelper = (params?: {
  pipetteId?: string
  addressableAreaName: AddressableAreaName
}): CreateCommand => ({
  commandType: 'moveToAddressableArea',
  key: expect.any(String),
  params: {
    pipetteId: DEFAULT_PIPETTE,
    addressableAreaName: ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
    offset: { x: 0, y: 0, z: 0 },
    ...params,
  },
})
