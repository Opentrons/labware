import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import {
  COLUMN,
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
  getWellDepth,
} from '@opentrons/shared-data'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { movableTrashCommandsUtil } from '../../utils/movableTrashCommandsUtil'
import {
  blowoutUtil,
  curryCommandCreator,
  reduceCommandCreators,
  wasteChuteCommandsUtil,
  airGapHelper,
  dispenseLocationHelper,
  moveHelper,
  getIsSafePipetteMovement,
  getWasteChuteAddressableAreaNamePip,
  getHasWasteChute,
  getTrashOrLabware,
} from '../../utils'
import {
  airGapInPlace,
  aspirate,
  configureForVolume,
  delay,
  dropTip,
  moveToWell,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'
import { replaceTip } from './replaceTip'

import type {
  ConsolidateArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'

export const consolidate: CommandCreator<ConsolidateArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /**
    Consolidate will aspirate several times in sequence from multiple source wells,
    then dispense into a single destination.
     If the volume to aspirate from the source wells exceeds the max volume of the pipette,
    then consolidate will be broken up into multiple asp-asp-disp, asp-asp-disp cycles.
     A single uniform volume will be aspirated from every source well.
     =====
     For consolidate, changeTip means:
    * 'always': before the first aspirate in a single asp-asp-disp cycle, get a fresh tip
    * 'once': get a new tip at the beginning of the consolidate step, and use it throughout
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
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dispenseAirGapVolume,
    dispenseDelay,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    mixFirstAspirate,
    mixInDestination,
    dropTipLocation,
    aspirateXOffset,
    aspirateYOffset,
    dispenseXOffset,
    dispenseYOffset,
    destLabware,
    sourceLabware,
    nozzles,
  } = args

  const pipetteData = prevRobotState.pipettes[args.pipette]
  const is96Channel =
    invariantContext.pipetteEntities[args.pipette]?.spec.channels === 96

  if (!pipetteData) {
    // bail out before doing anything else
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          pipette: args.pipette,
        }),
      ],
    }
  }

  if (
    !args.destLabware ||
    (!invariantContext.labwareEntities[args.destLabware] &&
      !invariantContext.additionalEquipmentEntities[args.destLabware])
  ) {
    return { errors: [errorCreators.equipmentDoesNotExist()] }
  }

  const initialDestLabwareSlot = prevRobotState.labware[destLabware]?.slot
  const initialSourceLabwareSlot = prevRobotState.labware[sourceLabware]?.slot
  const hasWasteChute = getHasWasteChute(
    invariantContext.additionalEquipmentEntities
  )

  if (
    hasWasteChute &&
    (initialDestLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA ||
      initialSourceLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA)
  ) {
    return { errors: [errorCreators.labwareDiscarded()] }
  }

  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
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
    return {
      errors: [errorCreators.possiblePipetteCollision()],
    }
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
    return {
      errors: [errorCreators.possiblePipetteCollision()],
    }
  }

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const maxWellsPerChunk = Math.floor(
    getPipetteWithTipMaxVol(args.pipette, invariantContext, args.tipRack) /
      (args.volume + aspirateAirGapVolume)
  )
  const sourceLabwareDef =
    invariantContext.labwareEntities[args.sourceLabware].def

  const trashOrLabware = getTrashOrLabware(
    invariantContext.labwareEntities,
    invariantContext.additionalEquipmentEntities,
    args.destLabware
  )

  const destinationWell = args.destWell
  const destLabwareDef =
    trashOrLabware === 'labware'
      ? invariantContext.labwareEntities[args.destLabware].def
      : null
  const wellDepth =
    destLabwareDef != null && destinationWell != null
      ? getWellDepth(destLabwareDef, destinationWell)
      : 0
  const airGapOffsetDestWell = wellDepth + AIR_GAP_OFFSET_FROM_TOP

  const sourceWellChunks = chunk(args.sourceWells, maxWellsPerChunk)

  const isWasteChute =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation] !=
      null &&
    invariantContext.additionalEquipmentEntities[args.dropTipLocation].name ===
      'wasteChute'
  const isTrashBin =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation] !=
      null &&
    invariantContext.additionalEquipmentEntities[args.dropTipLocation].name ===
      'trashBin'
  const channels = invariantContext.pipetteEntities[args.pipette].spec.channels
  const addressableAreaNameWasteChute = getWasteChuteAddressableAreaNamePip(
    channels
  )

  const commandCreators = flatMap(
    sourceWellChunks,
    (
      sourceWellChunk: string[],
      chunkIndex: number
    ): CurriedCommandCreator[] => {
      const isLastChunk = chunkIndex + 1 === sourceWellChunks.length
      // Aspirate commands for all source wells in the chunk
      const aspirateCommands = flatMap(
        sourceWellChunk,
        (sourceWell: string, wellIndex: number): CurriedCommandCreator[] => {
          const airGapOffsetSourceWell =
            getWellDepth(sourceLabwareDef, sourceWell) + AIR_GAP_OFFSET_FROM_TOP
          const airGapAfterAspirateCommands = aspirateAirGapVolume
            ? [
                curryCommandCreator(moveToWell, {
                  pipetteId: args.pipette,
                  labwareId: args.sourceLabware,
                  wellName: sourceWell,
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
              ]
            : []
          const delayAfterAspirateCommands =
            aspirateDelay != null
              ? [
                  curryCommandCreator(moveToWell, {
                    pipetteId: args.pipette,
                    labwareId: args.sourceLabware,
                    wellName: sourceWell,
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
                  wellName: sourceWell,
                  wellLocation: {
                    origin: 'top',
                    offset: {
                      z: args.touchTipAfterAspirateOffsetMmFromTop,
                    },
                  },
                }),
              ]
            : []

          return [
            curryCommandCreator(aspirate, {
              pipetteId: args.pipette,
              volume: args.volume,
              labwareId: args.sourceLabware,
              wellName: sourceWell,
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
          ]
        }
      )
      let tipCommands: CurriedCommandCreator[] = []

      if (
        args.changeTip === 'always' ||
        (args.changeTip === 'once' && chunkIndex === 0)
      ) {
        tipCommands = [
          curryCommandCreator(replaceTip, {
            pipette: args.pipette,
            dropTipLocation,
            tipRack: args.tipRack,
            nozzles: args.nozzles ?? undefined,
          }),
        ]
      }

      //  can not touch tip in a waste chute
      const touchTipAfterDispenseCommands: CurriedCommandCreator[] =
        args.touchTipAfterDispense && destinationWell != null
          ? [
              curryCommandCreator(touchTip, {
                pipetteId: args.pipette,
                labwareId: args.destLabware,
                wellName: destinationWell,
                wellLocation: {
                  origin: 'top',
                  offset: {
                    z: args.touchTipAfterDispenseOffsetMmFromTop,
                  },
                },
              }),
            ]
          : []
      const mixBeforeCommands =
        mixFirstAspirate != null
          ? mixUtil({
              pipette: args.pipette,
              labware: args.sourceLabware,
              well: sourceWellChunk[0],
              volume: mixFirstAspirate.volume,
              times: mixFirstAspirate.times,
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
      const preWetTipCommands = args.preWetTip // Pre-wet tip is equivalent to a single mix, with volume equal to the consolidate volume.
        ? mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: sourceWellChunk[0],
            volume: args.volume,
            times: 1,
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
      //  can not mix in a waste chute
      const mixAfterCommands =
        mixInDestination != null && destinationWell != null
          ? mixUtil({
              pipette: args.pipette,
              labware: args.destLabware,
              well: destinationWell,
              volume: mixInDestination.volume,
              times: mixInDestination.times,
              offsetFromBottomMm: dispenseOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
              xOffset: dispenseXOffset,
              yOffset: dispenseYOffset,
              nozzles,
            })
          : []

      const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
        invariantContext.pipetteEntities[args.pipette].name
      )
        ? [
            curryCommandCreator(configureForVolume, {
              pipetteId: args.pipette,
              volume:
                args.volume * sourceWellChunk.length +
                aspirateAirGapVolume * sourceWellChunk.length,
            }),
          ]
        : []
      const dispenseCommands = [
        curryCommandCreator(dispenseLocationHelper, {
          pipetteId: args.pipette,
          volume:
            args.volume * sourceWellChunk.length +
            aspirateAirGapVolume * sourceWellChunk.length,
          destinationId: args.destLabware,
          well: destinationWell ?? undefined,
          flowRate: dispenseFlowRateUlSec,
          offsetFromBottomMm: dispenseOffsetFromBottomMm,
          xOffset: dispenseXOffset,
          yOffset: dispenseYOffset,
          nozzles,
          tipRack: args.tipRack,
        }),
      ]

      const delayAfterDispenseCommands =
        dispenseDelay != null
          ? [
              curryCommandCreator(moveHelper, {
                pipetteId: args.pipette,
                destinationId: args.destLabware,
                well: destinationWell ?? undefined,
                zOffset: dispenseDelay.mmFromBottom,
              }),
              curryCommandCreator(delay, {
                seconds: dispenseDelay.seconds,
              }),
            ]
          : []

      const blowoutCommand = blowoutUtil({
        pipette: args.pipette,
        sourceLabwareId: args.sourceLabware,
        sourceWell: sourceWellChunk[0],
        destLabwareId: args.destLabware,
        destWell: destinationWell,
        blowoutLocation: args.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
        prevRobotState,
      })

      const willReuseTip = args.changeTip !== 'always' && !isLastChunk
      const airGapAfterDispenseCommands =
        dispenseAirGapVolume && !willReuseTip
          ? [
              curryCommandCreator(airGapHelper, {
                pipetteId: args.pipette,
                volume: dispenseAirGapVolume,
                destinationId: args.destLabware,
                destWell: destinationWell,
                flowRate: aspirateFlowRateUlSec,
                offsetFromBottomMm: airGapOffsetDestWell,
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

      return [
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixBeforeCommands,
        ...preWetTipCommands, // NOTE when you both mix-before and pre-wet tip, it's kinda redundant. Prewet is like mixing once.
        ...aspirateCommands,
        ...dispenseCommands,
        ...delayAfterDispenseCommands,
        ...mixAfterCommands,
        ...blowoutCommand,
        ...touchTipAfterDispenseCommands,
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
