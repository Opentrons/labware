import assert from 'assert'
import zip from 'lodash/zip'
import {
  getWellDepth,
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { movableTrashCommandsUtil } from '../../utils/movableTrashCommandsUtil'
import {
  blowoutUtil,
  curryCommandCreator,
  airGapHelper,
  reduceCommandCreators,
  wasteChuteCommandsUtil,
  getTrashOrLabware,
  dispenseLocationHelper,
  moveHelper,
  getWasteChuteAddressableAreaNamePip,
  getHasWasteChute,
} from '../../utils'
import {
  aspirate,
  configureForVolume,
  delay,
  dispense,
  dropTip,
  moveToWell,
  replaceTip,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'

import type {
  TransferArgs,
  CurriedCommandCreator,
  CommandCreator,
  CommandCreatorError,
} from '../../types'
export const transfer: CommandCreator<TransferArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /**
    Transfer will iterate through a set of 1 or more source and destination wells.
    For each pair, it will aspirate from the source well, then dispense into the destination well.
    This pair of 1 source well and 1 dest well is internally called a "sub-transfer".
     If the volume to aspirate from a source well exceeds the max volume of the pipette,
    then each sub-transfer will be chunked into multiple asp-disp, asp-disp commands.
     A single uniform volume will be aspirated from every source well and dispensed into every dest well.
    In other words, all the sub-transfers will use the same uniform volume.
     =====
     For transfer, changeTip means:
    * 'always': before each aspirate, get a fresh tip
    * 'once': get a new tip at the beginning of the transfer step, and use it throughout
    * 'never': reuse the tip from the last step
    * 'perSource': change tip each time you encounter a new source well (including the first one)
    * 'perDest': change tip each time you encounter a new destination well (including the first one)
    NOTE: In some situations, different changeTip options have equivalent outcomes. That's OK.
  */

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateDelay,
    dispenseDelay,
    aspirateFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    tipRack,
    aspirateXOffset,
    aspirateYOffset,
    destLabware,
    sourceLabware,
    dispenseXOffset,
    dispenseYOffset,
  } = args

  const trashOrLabware = getTrashOrLabware(
    invariantContext.labwareEntities,
    invariantContext.additionalEquipmentEntities,
    args.destLabware
  )

  if (
    (trashOrLabware === 'labware' &&
      args.destWells != null &&
      args.sourceWells.length === args.destWells.length) ||
    ((trashOrLabware === 'wasteChute' || trashOrLabware === 'trashBin') &&
      args.destWells == null &&
      args.sourceWells.length >= 1)
  ) {
    // No assertion failure, continue with the logic
  } else {
    assert(
      false,
      `Transfer command creator expected N:N source-to-dest wells ratio. Got ${args.sourceWells.length}:${args.destWells?.length} in labware`
    )
  }

  // TODO Ian 2018-04-02 following ~10 lines are identical to first lines of consolidate.js...
  const actionName = 'transfer'
  const errors: CommandCreatorError[] = []

  if (
    !prevRobotState.pipettes[args.pipette] ||
    !invariantContext.pipetteEntities[args.pipette]
  ) {
    // bail out before doing anything else
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
    errors.push(errorCreators.labwareDiscarded())
  }

  if (
    !args.destLabware ||
    (!invariantContext.labwareEntities[args.destLabware] &&
      !invariantContext.additionalEquipmentEntities[args.destLabware])
  ) {
    errors.push(errorCreators.equipmentDoesNotExist())
  }

  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    errors.push(errorCreators.dropTipLocationDoesNotExist())
  }

  if (errors.length > 0)
    return {
      errors,
    }
  const pipetteSpec = invariantContext.pipetteEntities[args.pipette].spec

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

  const addressableAreaNameWasteChute = getWasteChuteAddressableAreaNamePip(
    pipetteSpec.channels
  )

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const dispenseAirGapVolume = args.dispenseAirGapVolume || 0
  const effectiveTransferVol =
    getPipetteWithTipMaxVol(args.pipette, invariantContext, tipRack) -
    aspirateAirGapVolume
  const liquidMinVolumes = Object.values(pipetteSpec.liquids).map(
    liquid => liquid.minVolume
  )
  //  account for minVolume for lowVolume pipettes
  const pipetteMinVol = Math.min(...liquidMinVolumes)
  const chunksPerSubTransfer = Math.ceil(args.volume / effectiveTransferVol)
  const lastSubTransferVol =
    args.volume - (chunksPerSubTransfer - 1) * effectiveTransferVol
  // volume of each chunk in a sub-transfer
  let subTransferVolumes: number[] = Array(chunksPerSubTransfer - 1)
    .fill(effectiveTransferVol)
    .concat(lastSubTransferVol)

  if (chunksPerSubTransfer > 1 && lastSubTransferVol < pipetteMinVol) {
    // last chunk volume is below pipette min, split the last
    const splitLastVol = (effectiveTransferVol + lastSubTransferVol) / 2
    subTransferVolumes = Array(chunksPerSubTransfer - 2)
      .fill(effectiveTransferVol)
      .concat(splitLastVol)
      .concat(splitLastVol)
  }

  // @ts-expect-error(SA, 2021-05-05): zip can return undefined so this really should be Array<[string | undefined, string | undefined]>
  const sourceDestPairs: Array<[string, string | null]> = zip(
    args.sourceWells,
    args.destWells
  )
  let prevSourceWell: string | null = null
  let prevDestWell: string | null = null
  const commandCreators = sourceDestPairs.reduce(
    (
      outerAcc: CurriedCommandCreator[],
      wellPair: [string, string | null],
      pairIdx: number
    ): CurriedCommandCreator[] => {
      const [sourceWell, destinationWell] = wellPair
      const sourceLabwareDef =
        invariantContext.labwareEntities[args.sourceLabware].def
      const destLabwareDef =
        trashOrLabware === 'labware'
          ? invariantContext.labwareEntities[args.destLabware].def
          : null
      const wellDepth =
        destinationWell != null && destLabwareDef != null
          ? getWellDepth(destLabwareDef, destinationWell)
          : 0
      const airGapOffsetSourceWell =
        getWellDepth(sourceLabwareDef, sourceWell) + AIR_GAP_OFFSET_FROM_TOP
      const airGapOffsetDestWell = wellDepth + AIR_GAP_OFFSET_FROM_TOP
      const commands = subTransferVolumes.reduce(
        (
          innerAcc: CurriedCommandCreator[],
          subTransferVol: number,
          chunkIdx: number
        ): CurriedCommandCreator[] => {
          const isInitialSubtransfer = pairIdx === 0 && chunkIdx === 0
          const isLastPair = pairIdx + 1 === sourceDestPairs.length
          const isLastChunk = chunkIdx + 1 === subTransferVolumes.length
          let changeTipNow = false // 'never' by default

          if (args.changeTip === 'always') {
            changeTipNow = true
          } else if (args.changeTip === 'once') {
            changeTipNow = isInitialSubtransfer
          } else if (args.changeTip === 'perSource') {
            changeTipNow = sourceWell !== prevSourceWell
          } else if (args.changeTip === 'perDest') {
            changeTipNow =
              isInitialSubtransfer || destinationWell !== prevDestWell
          }

          const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
            invariantContext.pipetteEntities[args.pipette].name
          )
            ? [
                curryCommandCreator(configureForVolume, {
                  pipetteId: args.pipette,
                  volume: chunksPerSubTransfer,
                }),
              ]
            : []

          const tipCommands: CurriedCommandCreator[] = changeTipNow
            ? [
                curryCommandCreator(replaceTip, {
                  pipette: args.pipette,
                  nozzles: args.nozzles ?? undefined,
                  dropTipLocation: args.dropTipLocation,
                  tipRack: args.tipRack,
                }),
              ]
            : []
          const preWetTipCommands =
            args.preWetTip && chunkIdx === 0
              ? mixUtil({
                  pipette: args.pipette,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  volume: Math.max(subTransferVol),
                  times: 1,
                  aspirateOffsetFromBottomMm,
                  dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
                  aspirateFlowRateUlSec,
                  dispenseFlowRateUlSec,
                  aspirateDelaySeconds: aspirateDelay?.seconds,
                  dispenseDelaySeconds: dispenseDelay?.seconds,
                  tipRack,
                  aspirateXOffset,
                  aspirateYOffset,
                  dispenseXOffset,
                  dispenseYOffset,
                  nozzles: args.nozzles,
                })
              : []
          const mixBeforeAspirateCommands =
            args.mixBeforeAspirate != null
              ? mixUtil({
                  pipette: args.pipette,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  volume: args.mixBeforeAspirate.volume,
                  times: args.mixBeforeAspirate.times,
                  aspirateOffsetFromBottomMm,
                  dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
                  aspirateFlowRateUlSec,
                  dispenseFlowRateUlSec,
                  aspirateDelaySeconds: aspirateDelay?.seconds,
                  dispenseDelaySeconds: dispenseDelay?.seconds,
                  tipRack,
                  aspirateXOffset,
                  aspirateYOffset,
                  dispenseXOffset,
                  dispenseYOffset,
                  nozzles: args.nozzles,
                })
              : []
          const delayAfterAspirateCommands =
            aspirateDelay != null
              ? [
                  curryCommandCreator(moveToWell, {
                    pipette: args.pipette,
                    labware: args.sourceLabware,
                    well: sourceWell,
                    offset: {
                      x: 0,
                      y: 0,
                      z: aspirateDelay.mmFromBottom,
                    },
                  }),
                  curryCommandCreator(delay, {
                    commandCreatorFnName: 'delay',
                    description: null,
                    name: null,
                    meta: null,
                    wait: aspirateDelay.seconds,
                  }),
                ]
              : []
          const touchTipAfterAspirateCommands = args.touchTipAfterAspirate
            ? [
                curryCommandCreator(touchTip, {
                  pipette: args.pipette,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  offsetFromBottomMm:
                    args.touchTipAfterAspirateOffsetMmFromBottom,
                }),
              ]
            : []
          //  can not touch tip in a waste chute
          const touchTipAfterDispenseCommands =
            args.touchTipAfterDispense && destinationWell != null
              ? [
                  curryCommandCreator(touchTip, {
                    pipette: args.pipette,
                    labware: args.destLabware,
                    well: destinationWell,
                    offsetFromBottomMm:
                      args.touchTipAfterDispenseOffsetMmFromBottom,
                  }),
                ]
              : []
          //  can not mix in a waste chute
          const mixInDestinationCommands =
            args.mixInDestination != null && destinationWell != null
              ? mixUtil({
                  pipette: args.pipette,
                  labware: args.destLabware,
                  well: destinationWell,
                  volume: args.mixInDestination.volume,
                  times: args.mixInDestination.times,
                  aspirateOffsetFromBottomMm: dispenseOffsetFromBottomMm,
                  dispenseOffsetFromBottomMm,
                  aspirateFlowRateUlSec,
                  dispenseFlowRateUlSec,
                  aspirateDelaySeconds: aspirateDelay?.seconds,
                  dispenseDelaySeconds: dispenseDelay?.seconds,
                  tipRack,
                  aspirateXOffset,
                  aspirateYOffset,
                  dispenseXOffset,
                  dispenseYOffset,
                  nozzles: args.nozzles,
                })
              : []

          const airGapAfterAspirateCommands =
            aspirateAirGapVolume && destinationWell != null
              ? [
                  curryCommandCreator(aspirate, {
                    pipette: args.pipette,
                    volume: aspirateAirGapVolume,
                    labware: args.sourceLabware,
                    well: sourceWell,
                    flowRate: aspirateFlowRateUlSec,
                    offsetFromBottomMm: airGapOffsetSourceWell,
                    isAirGap: true,
                    tipRack,
                    xOffset: 0,
                    yOffset: 0,
                    nozzles: args.nozzles,
                  }),
                  ...(aspirateDelay != null
                    ? [
                        curryCommandCreator(delay, {
                          commandCreatorFnName: 'delay',
                          description: null,
                          name: null,
                          meta: null,
                          wait: aspirateDelay.seconds,
                        }),
                      ]
                    : []),
                  curryCommandCreator(dispense, {
                    pipette: args.pipette,
                    volume: aspirateAirGapVolume,
                    labware: args.destLabware,
                    well: destinationWell,
                    flowRate: dispenseFlowRateUlSec,
                    offsetFromBottomMm: airGapOffsetDestWell,
                    isAirGap: true,
                    xOffset: 0,
                    yOffset: 0,
                    tipRack: args.tipRack,
                    nozzles: args.nozzles,
                  }),
                  ...(dispenseDelay != null
                    ? [
                        curryCommandCreator(delay, {
                          commandCreatorFnName: 'delay',
                          description: null,
                          name: null,
                          meta: null,
                          wait: dispenseDelay.seconds,
                        }),
                      ]
                    : []),
                ]
              : []
          // `willReuseTip` is like changeTipNow, but thinking ahead about
          //  the NEXT subtransfer and not this current one
          let willReuseTip = true // never or once --> true

          if (isLastChunk && isLastPair) {
            // if we're at the end of this step, we won't reuse the tip in this step
            // so we can discard it (even if changeTip is never, we'll drop it!)
            willReuseTip = false
          } else if (args.changeTip === 'always') {
            willReuseTip = false
          } else if (args.changeTip === 'perSource' && !isLastPair) {
            const nextSourceWell = sourceDestPairs[pairIdx + 1][0]
            willReuseTip = nextSourceWell === sourceWell
          } else if (args.changeTip === 'perDest' && !isLastPair) {
            const nextDestWell = sourceDestPairs[pairIdx + 1][1]
            willReuseTip = nextDestWell === destinationWell
          }

          const aspirateCommand = [
            curryCommandCreator(aspirate, {
              pipette: args.pipette,
              volume: subTransferVol,
              labware: args.sourceLabware,
              well: sourceWell,
              flowRate: aspirateFlowRateUlSec,
              offsetFromBottomMm: aspirateOffsetFromBottomMm,
              tipRack,
              xOffset: aspirateXOffset,
              yOffset: aspirateYOffset,
              nozzles: args.nozzles,
            }),
          ]
          const dispenseCommand = [
            curryCommandCreator(dispenseLocationHelper, {
              pipetteId: args.pipette,
              volume: subTransferVol,
              destinationId: args.destLabware,
              well: destinationWell ?? undefined,
              flowRate: dispenseFlowRateUlSec,
              offsetFromBottomMm: dispenseOffsetFromBottomMm,
              xOffset: dispenseXOffset,
              yOffset: dispenseYOffset,
              tipRack: args.tipRack,
              nozzles: args.nozzles,
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
                    commandCreatorFnName: 'delay',
                    description: null,
                    name: null,
                    meta: null,
                    wait: dispenseDelay.seconds,
                  }),
                ]
              : []

          const blowoutCommand = blowoutUtil({
            pipette: args.pipette,
            sourceLabwareId: args.sourceLabware,
            sourceWell: sourceWell,
            destLabwareId: args.destLabware,
            destWell: destinationWell,
            blowoutLocation: args.blowoutLocation,
            flowRate: blowoutFlowRateUlSec,
            offsetFromTopMm: blowoutOffsetFromTopMm,
            invariantContext,
            prevRobotState,
          })

          const airGapAfterDispenseCommands =
            dispenseAirGapVolume && !willReuseTip
              ? [
                  curryCommandCreator(airGapHelper, {
                    sourceWell,
                    blowOutLocation: args.blowoutLocation,
                    sourceId: args.sourceLabware,
                    pipetteId: args.pipette,
                    volume: dispenseAirGapVolume,
                    destinationId: args.destLabware,
                    destWell: destinationWell,
                    flowRate: aspirateFlowRateUlSec,
                    offsetFromBottomMm: airGapOffsetDestWell,
                    tipRack,
                    nozzles: args.nozzles,
                  }),
                  ...(aspirateDelay != null
                    ? [
                        curryCommandCreator(delay, {
                          commandCreatorFnName: 'delay',
                          description: null,
                          name: null,
                          meta: null,
                          wait: aspirateDelay.seconds,
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
              invariantContext,
              prevRobotState,
            })
          }

          // if using dispense > air gap, drop or change the tip at the end
          const dropTipAfterDispenseAirGap =
            airGapAfterDispenseCommands.length > 0 && isLastChunk && isLastPair
              ? dropTipCommand
              : []

          const nextCommands = [
            ...tipCommands,
            ...preWetTipCommands,
            ...configureForVolumeCommand,
            ...mixBeforeAspirateCommands,
            ...aspirateCommand,
            ...delayAfterAspirateCommands,
            ...touchTipAfterAspirateCommands,
            ...airGapAfterAspirateCommands,
            ...dispenseCommand,
            ...delayAfterDispenseCommands,
            ...mixInDestinationCommands,
            ...blowoutCommand,
            ...touchTipAfterDispenseCommands,
            ...airGapAfterDispenseCommands,
            ...dropTipAfterDispenseAirGap,
          ]
          // NOTE: side-effecting
          prevSourceWell = sourceWell
          prevDestWell = destinationWell
          return [...innerAcc, ...nextCommands]
        },
        []
      )
      return [...outerAcc, ...commands]
    },
    []
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
