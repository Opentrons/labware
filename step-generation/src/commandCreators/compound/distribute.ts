import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import last from 'lodash/last'
import {
  COLUMN,
  getWellDepth,
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { movableTrashCommandsUtil } from '../../utils/movableTrashCommandsUtil'
import {
  curryCommandCreator,
  reduceCommandCreators,
  blowoutUtil,
  wasteChuteCommandsUtil,
  getIsSafePipetteMovement,
  getWasteChuteAddressableAreaNamePip,
  getHasWasteChute,
  getDispenseAirGapLocation,
} from '../../utils'
import {
  airGapInPlace,
  aspirate,
  configureForVolume,
  delay,
  dispense,
  dropTip,
  moveToWell,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'
import { replaceTip } from './replaceTip'

import type {
  DistributeArgs,
  CommandCreator,
  CurriedCommandCreator,
  CommandCreatorError,
} from '../../types'
export const distribute: CommandCreator<DistributeArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /**
    Distribute will aspirate from a single source well into multiple destination wells.
     If the volume to aspirate from the source well exceeds the max volume of the pipette,
    then distribute will be broken up into multiple asp-disp-disp, asp-disp-disp cycles.
     A single uniform volume will be aspirated to every destination well.
     =====
     For distribute, changeTip means:
    * 'always': before the first aspirate in a single asp-disp-disp cycle, get a fresh tip
    * 'once': get a new tip at the beginning of the distribute step, and use it throughout
    * 'never': reuse the tip from the last step
  */

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateDelay,
    aspirateFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    dispenseDelay,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    blowoutLocation,
    aspirateXOffset,
    aspirateYOffset,
    dispenseXOffset,
    dispenseYOffset,
    nozzles,
  } = args

  // TODO Ian 2018-05-03 next ~20 lines match consolidate.js
  const actionName = 'distribute'
  const errors: CommandCreatorError[] = []
  const is96Channel =
    invariantContext.pipetteEntities[args.pipette]?.spec.channels === 96

  // TODO: Ian 2019-04-19 revisit these pipetteDoesNotExist errors, how to do it DRY?
  if (
    !prevRobotState.pipettes[args.pipette] ||
    !invariantContext.pipetteEntities[args.pipette]
  ) {
    errors.push(
      errorCreators.pipetteDoesNotExist({
        pipette: args.pipette,
      })
    )
  }

  if (!args.sourceLabware || !prevRobotState.labware[args.sourceLabware]) {
    errors.push(
      errorCreators.labwareDoesNotExist({
        actionName,
        labware: args.sourceLabware,
      })
    )
  }

  const initialDestLabwareSlot = prevRobotState.labware[args.destLabware]?.slot
  const initialSourceLabwareSlot =
    prevRobotState.labware[args.sourceLabware]?.slot
  const hasWasteChute = getHasWasteChute(
    invariantContext.additionalEquipmentEntities
  )

  if (
    hasWasteChute &&
    (initialDestLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA ||
      initialSourceLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA)
  ) {
    errors.push(errorCreators.labwareDiscarded())
  }

  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    errors.push(errorCreators.dropTipLocationDoesNotExist())
  }

  if (
    is96Channel &&
    args.nozzles === COLUMN &&
    !getIsSafePipetteMovement(
      prevRobotState,
      invariantContext,
      args.pipette,
      args.sourceLabware,
      args.tipRack,
      { x: aspirateXOffset, y: aspirateYOffset }
    )
  ) {
    errors.push(errorCreators.possiblePipetteCollision())
  }

  if (
    is96Channel &&
    args.nozzles === COLUMN &&
    !getIsSafePipetteMovement(
      prevRobotState,
      invariantContext,
      args.pipette,
      args.destLabware,
      args.tipRack,
      { x: dispenseXOffset, y: dispenseYOffset }
    )
  ) {
    errors.push(errorCreators.possiblePipetteCollision())
  }

  if (errors.length > 0)
    return {
      errors,
    }

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const dispenseAirGapVolume = args.dispenseAirGapVolume || 0
  // TODO error on negative args.disposalVolume?
  const disposalVolume =
    args.disposalVolume && args.disposalVolume > 0 ? args.disposalVolume : 0
  const maxVolume =
    getPipetteWithTipMaxVol(args.pipette, invariantContext, args.tipRack) -
    aspirateAirGapVolume
  const maxWellsPerChunk = Math.floor(
    (maxVolume - disposalVolume) / args.volume
  )
  const { pipette } = args

  const isWasteChute =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation]?.name ===
    'wasteChute'
  const isTrashBin =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation]?.name ===
    'trashBin'

  const channels = invariantContext.pipetteEntities[args.pipette].spec.channels
  const addressableAreaNameWasteChute = getWasteChuteAddressableAreaNamePip(
    channels
  )

  if (maxWellsPerChunk === 0) {
    // distribute vol exceeds pipette vol
    return {
      errors: [
        errorCreators.pipetteVolumeExceeded({
          actionName,
          volume: args.volume,
          maxVolume,
          disposalVolume,
        }),
      ],
    }
  }

  const destWellChunks = chunk(args.destWells, maxWellsPerChunk)
  const commandCreators = flatMap(
    destWellChunks,
    (destWellChunk: string[], chunkIndex: number): CurriedCommandCreator[] => {
      const firstDestWell = destWellChunk[0]
      const sourceLabwareDef =
        invariantContext.labwareEntities[args.sourceLabware].def
      const destLabwareDef =
        invariantContext.labwareEntities[args.destLabware].def
      const airGapOffsetSourceWell =
        getWellDepth(sourceLabwareDef, args.sourceWell) +
        AIR_GAP_OFFSET_FROM_TOP
      const airGapOffsetDestWell =
        getWellDepth(destLabwareDef, firstDestWell) + AIR_GAP_OFFSET_FROM_TOP
      const airGapAfterAspirateCommands = aspirateAirGapVolume
        ? [
            curryCommandCreator(moveToWell, {
              pipetteId: args.pipette,
              labwareId: args.sourceLabware,
              wellName: args.sourceWell,
              wellLocation: {
                origin: 'bottom',
                offset: {
                  z: airGapOffsetSourceWell,
                  x: 0,
                  y: 0,
                },
              },
            }),
            curryCommandCreator(airGapInPlace, {
              pipetteId: args.pipette,
              volume: aspirateAirGapVolume,
              flowRate: aspirateFlowRateUlSec,
            }),
            ...(aspirateDelay != null
              ? [
                  curryCommandCreator(delay, {
                    seconds: aspirateDelay.seconds,
                  }),
                ]
              : []),
            curryCommandCreator(dispense, {
              pipetteId: args.pipette,
              volume: aspirateAirGapVolume,
              labwareId: args.destLabware,
              wellName: firstDestWell,
              flowRate: dispenseFlowRateUlSec,
              wellLocation: {
                origin: 'bottom',
                offset: {
                  z: airGapOffsetDestWell,
                  x: 0,
                  y: 0,
                },
              },
              nozzles,
              tipRack: args.tipRack,
            }),
            ...(dispenseDelay != null
              ? [
                  curryCommandCreator(delay, {
                    seconds: dispenseDelay.seconds,
                  }),
                ]
              : []),
          ]
        : []
      const dispenseCommands = flatMap(
        destWellChunk,
        (destWell: string, wellIndex: number): CurriedCommandCreator[] => {
          const delayAfterDispenseCommands =
            dispenseDelay != null
              ? [
                  curryCommandCreator(moveToWell, {
                    pipetteId: args.pipette,
                    labwareId: args.destLabware,
                    wellName: destWell,
                    wellLocation: {
                      origin: 'bottom',
                      offset: {
                        x: 0,
                        y: 0,
                        z: dispenseDelay.mmFromBottom,
                      },
                    },
                  }),
                  curryCommandCreator(delay, {
                    seconds: dispenseDelay.seconds,
                  }),
                ]
              : []
          const touchTipAfterDispenseCommand = args.touchTipAfterDispense
            ? [
                curryCommandCreator(touchTip, {
                  pipetteId: pipette,
                  labwareId: args.destLabware,
                  wellName: destWell,
                  wellLocation: {
                    origin: 'top',
                    offset: {
                      z: args.touchTipAfterDispenseOffsetMmFromTop,
                    },
                  },
                }),
              ]
            : []
          return [
            curryCommandCreator(dispense, {
              pipetteId: pipette,
              volume: args.volume,
              labwareId: args.destLabware,
              wellName: destWell,
              flowRate: dispenseFlowRateUlSec,
              wellLocation: {
                origin: 'bottom',
                offset: {
                  z: dispenseOffsetFromBottomMm,
                  x: dispenseXOffset,
                  y: dispenseYOffset,
                },
              },
              nozzles,
              tipRack: args.tipRack,
            }),
            ...delayAfterDispenseCommands,
            ...touchTipAfterDispenseCommand,
          ]
        }
      )
      // NOTE: identical to consolidate
      let tipCommands: CurriedCommandCreator[] = []

      if (
        args.changeTip === 'always' ||
        (args.changeTip === 'once' && chunkIndex === 0)
      ) {
        tipCommands = [
          curryCommandCreator(replaceTip, {
            pipette: args.pipette,
            dropTipLocation: args.dropTipLocation,
            tipRack: args.tipRack,
            nozzles: args.nozzles ?? undefined,
          }),
        ]
      }
      const {
        dispenseAirGapLabware,
        dispenseAirGapWell,
      } = getDispenseAirGapLocation({
        blowoutLocation,
        sourceLabware: args.sourceLabware,
        destLabware: args.destLabware,
        sourceWell: args.sourceWell,
        // @ts-expect-error(SA, 2021-05-05): last can return undefined
        destWell: last(destWellChunk),
      })
      const isLastChunk = chunkIndex + 1 === destWellChunks.length
      const willReuseTip = args.changeTip !== 'always' && !isLastChunk
      const airGapAfterDispenseCommands =
        dispenseAirGapVolume && !willReuseTip
          ? [
              curryCommandCreator(moveToWell, {
                pipetteId: args.pipette,
                labwareId: dispenseAirGapLabware,
                wellName: dispenseAirGapWell,
                wellLocation: {
                  origin: 'bottom',
                  offset: {
                    z: airGapOffsetDestWell,
                    x: 0,
                    y: 0,
                  },
                },
              }),
              curryCommandCreator(airGapInPlace, {
                pipetteId: args.pipette,
                volume: dispenseAirGapVolume,
                flowRate: aspirateFlowRateUlSec,
              }),
              ...(aspirateDelay != null
                ? [
                    curryCommandCreator(delay, {
                      seconds: aspirateDelay.seconds,
                    }),
                  ]
                : []),
            ]
          : []

      let dropTipCommand = [
        curryCommandCreator(dropTip, {
          pipette: args.pipette,
          dropTipLocation: args.dropTipLocation,
        }),
      ]
      if (isWasteChute) {
        dropTipCommand = wasteChuteCommandsUtil({
          type: 'dropTip',
          pipetteId: args.pipette,
          prevRobotState,
          addressableAreaName: addressableAreaNameWasteChute,
        })
      }
      if (isTrashBin) {
        dropTipCommand = movableTrashCommandsUtil({
          type: 'dropTip',
          pipetteId: args.pipette,
          prevRobotState,
          invariantContext,
        })
      }

      // if using dispense > air gap, drop or change the tip at the end
      const dropTipAfterDispenseAirGap =
        airGapAfterDispenseCommands.length > 0 ? dropTipCommand : []
      const blowoutCommands = disposalVolume
        ? blowoutUtil({
            pipette: pipette,
            sourceLabwareId: args.sourceLabware,
            sourceWell: args.sourceWell,
            destLabwareId: args.destLabware,
            // @ts-expect-error(SA, 2021-05-05): last can return undefined
            destWell: last(destWellChunk),
            blowoutLocation,
            flowRate: args.blowoutFlowRateUlSec,
            offsetFromTopMm: args.blowoutOffsetFromTopMm,
            invariantContext,
          })
        : []
      const delayAfterAspirateCommands =
        aspirateDelay != null
          ? [
              curryCommandCreator(moveToWell, {
                pipetteId: args.pipette,
                labwareId: args.sourceLabware,
                wellName: args.sourceWell,
                wellLocation: {
                  origin: 'bottom',
                  offset: {
                    x: 0,
                    y: 0,
                    z: aspirateDelay.mmFromBottom,
                  },
                },
              }),
              curryCommandCreator(delay, {
                seconds: aspirateDelay.seconds,
              }),
            ]
          : []
      const touchTipAfterAspirateCommand = args.touchTipAfterAspirate
        ? [
            curryCommandCreator(touchTip, {
              pipetteId: args.pipette,
              labwareId: args.sourceLabware,
              wellName: args.sourceWell,
              wellLocation: {
                origin: 'top',
                offset: {
                  z: args.touchTipAfterAspirateOffsetMmFromTop,
                },
              },
            }),
          ]
        : []
      const mixBeforeAspirateCommands =
        args.mixBeforeAspirate != null
          ? mixUtil({
              pipette: args.pipette,
              labware: args.sourceLabware,
              well: args.sourceWell,
              volume: args.mixBeforeAspirate.volume,
              times: args.mixBeforeAspirate.times,
              offsetFromBottomMm: aspirateOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
              xOffset: aspirateXOffset,
              yOffset: aspirateYOffset,
              nozzles,
            })
          : []

      const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
        invariantContext.pipetteEntities[args.pipette].name
      )
        ? [
            curryCommandCreator(configureForVolume, {
              pipetteId: args.pipette,
              volume: args.volume * destWellChunk.length + disposalVolume,
            }),
          ]
        : []
      const aspirateDisposalVolumeOnce = chunkIndex === 0 ? disposalVolume : 0
      return [
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixBeforeAspirateCommands,
        curryCommandCreator(aspirate, {
          pipetteId: pipette,
          volume:
            args.volume * destWellChunk.length +
            //  only add disposal volume if its the 1st chunk and changing tip once
            //  and not blowing out after dispenses
            (args.changeTip === 'once' && blowoutLocation == null
              ? aspirateDisposalVolumeOnce
              : disposalVolume),
          labwareId: args.sourceLabware,
          wellName: args.sourceWell,
          flowRate: aspirateFlowRateUlSec,
          wellLocation: {
            origin: 'bottom',
            offset: {
              z: aspirateOffsetFromBottomMm,
              x: aspirateXOffset,
              y: aspirateYOffset,
            },
          },
          tipRack: args.tipRack,
          nozzles,
        }),
        ...delayAfterAspirateCommands,
        ...touchTipAfterAspirateCommand,
        ...airGapAfterAspirateCommands,
        ...dispenseCommands,
        ...blowoutCommands,
        ...airGapAfterDispenseCommands,
        ...dropTipAfterDispenseAirGap,
      ]
    }
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
