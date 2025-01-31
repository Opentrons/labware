import flatMap from 'lodash/flatMap'
import {
  LOW_VOLUME_PIPETTES,
  COLUMN,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import {
  repeatArray,
  blowoutUtil,
  curryCommandCreator,
  reduceCommandCreators,
  getIsSafePipetteMovement,
  getHasWasteChute,
} from '../../utils'
import * as errorCreators from '../../errorCreators'
import {
  aspirate,
  configureForVolume,
  delay,
  dispense,
  touchTip,
} from '../atomic'
import { replaceTip } from './replaceTip'

import type { NozzleConfigurationStyle } from '@opentrons/shared-data'
import type {
  MixArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'
/** Helper fn to make mix command creators w/ minimal arguments */
export function mixUtil(args: {
  pipette: string
  labware: string
  well: string
  volume: number
  times: number
  offsetFromBottomMm: number
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  tipRack: string
  xOffset: number
  yOffset: number
  aspirateDelaySeconds?: number | null | undefined
  dispenseDelaySeconds?: number | null | undefined
  nozzles: NozzleConfigurationStyle | null
}): CurriedCommandCreator[] {
  const {
    pipette,
    labware,
    well,
    volume,
    times,
    offsetFromBottomMm,
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    aspirateDelaySeconds,
    dispenseDelaySeconds,
    tipRack,
    xOffset,
    yOffset,
    nozzles,
  } = args

  const getDelayCommand = (seconds?: number | null): CurriedCommandCreator[] =>
    seconds
      ? [
          curryCommandCreator(delay, {
            seconds,
          }),
        ]
      : []

  return repeatArray(
    [
      curryCommandCreator(aspirate, {
        pipetteId: pipette,
        volume,
        labwareId: labware,
        wellName: well,
        flowRate: aspirateFlowRateUlSec,
        tipRack,
        wellLocation: {
          origin: 'bottom',
          offset: {
            z: offsetFromBottomMm,
            x: xOffset,
            y: yOffset,
          },
        },
        nozzles: null,
      }),
      ...getDelayCommand(aspirateDelaySeconds),
      curryCommandCreator(dispense, {
        pipetteId: pipette,
        volume,
        labwareId: labware,
        wellName: well,
        wellLocation: {
          origin: 'bottom',
          offset: {
            z: offsetFromBottomMm,
            x: xOffset,
            y: yOffset,
          },
        },
        flowRate: dispenseFlowRateUlSec,
        tipRack,
        nozzles: nozzles,
      }),
      ...getDelayCommand(dispenseDelaySeconds),
    ],
    times
  )
}
export const mix: CommandCreator<MixArgs> = (
  data,
  invariantContext,
  prevRobotState
) => {
  /**
    Mix will aspirate and dispense a uniform volume some amount of times from a set of wells
    in a single labware.
     =====
     For mix, changeTip means:
    * 'always': before the first aspirate in each well, get a fresh tip
    * 'once': get a new tip at the beginning of the overall mix step, and use it throughout for all wells
    * 'never': reuse the tip from the last step
  */
  const actionName = 'mix'
  const {
    pipette,
    labware,
    wells,
    volume,
    times,
    changeTip,
    aspirateDelaySeconds,
    dispenseDelaySeconds,
    offsetFromBottomMm,
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dropTipLocation,
    tipRack,
    xOffset,
    yOffset,
    nozzles,
  } = data

  const is96Channel =
    invariantContext.pipetteEntities[pipette]?.spec.channels === 96

  // Errors
  if (
    !prevRobotState.pipettes[pipette] ||
    !invariantContext.pipetteEntities[pipette]
  ) {
    // bail out before doing anything else
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          pipette,
        }),
      ],
    }
  }

  if (!prevRobotState.labware[labware]) {
    return {
      errors: [
        errorCreators.labwareDoesNotExist({
          actionName,
          labware,
        }),
      ],
    }
  }

  const initialLabwareSlot = prevRobotState.labware[labware]?.slot
  const hasWasteChute = getHasWasteChute(
    invariantContext.additionalEquipmentEntities
  )

  if (
    hasWasteChute &&
    initialLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA
  ) {
    return { errors: [errorCreators.labwareDiscarded()] }
  }

  if (
    !dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[dropTipLocation]
  ) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
  }

  if (is96Channel && data.nozzles === COLUMN) {
    const isAspirateSafePipetteMovement = getIsSafePipetteMovement(
      prevRobotState,
      invariantContext,
      pipette,
      labware,
      tipRack,
      { x: xOffset, y: yOffset }
    )
    const isDispenseSafePipetteMovement = getIsSafePipetteMovement(
      prevRobotState,
      invariantContext,
      pipette,
      labware,
      tipRack,
      { x: xOffset, y: yOffset }
    )
    if (!isAspirateSafePipetteMovement && !isDispenseSafePipetteMovement) {
      return {
        errors: [errorCreators.possiblePipetteCollision()],
      }
    }
  }

  const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
    invariantContext.pipetteEntities[pipette].name
  )
    ? [
        curryCommandCreator(configureForVolume, {
          pipetteId: pipette,
          volume: volume,
        }),
      ]
    : []
  // Command generation
  const commandCreators = flatMap(
    wells,
    (well: string, wellIndex: number): CurriedCommandCreator[] => {
      let tipCommands: CurriedCommandCreator[] = []

      if (changeTip === 'always' || (changeTip === 'once' && wellIndex === 0)) {
        tipCommands = [
          curryCommandCreator(replaceTip, {
            pipette,
            dropTipLocation,
            nozzles: data.nozzles ?? undefined,
            tipRack,
          }),
        ]
      }

      const touchTipCommands = data.touchTip
        ? [
            curryCommandCreator(touchTip, {
              pipetteId: pipette,
              labwareId: labware,
              wellName: well,
              wellLocation: {
                origin: 'top',
                offset: {
                  z: data.touchTipMmFromTop,
                },
              },
            }),
          ]
        : []
      const blowoutCommand = blowoutUtil({
        pipette: data.pipette,
        sourceLabwareId: data.labware,
        sourceWell: well,
        destLabwareId: data.labware,
        destWell: well,
        blowoutLocation: data.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
        prevRobotState,
      })
      const mixCommands = mixUtil({
        pipette,
        labware,
        well,
        volume,
        times,
        offsetFromBottomMm,
        aspirateFlowRateUlSec,
        dispenseFlowRateUlSec,
        aspirateDelaySeconds,
        dispenseDelaySeconds,
        tipRack,
        xOffset,
        yOffset,
        nozzles,
      })
      return [
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixCommands,
        ...blowoutCommand,
        ...touchTipCommands,
      ]
    }
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
