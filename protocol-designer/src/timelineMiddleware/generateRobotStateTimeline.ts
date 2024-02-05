import {
  dropTipInPlace,
  moveToAddressableArea,
  getWasteChuteAddressableAreaNamePip,
  movableTrashCommandsUtil,
} from '@opentrons/step-generation'
import * as StepGeneration from '@opentrons/step-generation'
import { commandCreatorFromStepArgs } from '../file-data/helpers'
import type { StepArgsAndErrorsById } from '../steplist/types'

export interface GenerateRobotStateTimelineArgs {
  allStepArgsAndErrors: StepArgsAndErrorsById
  orderedStepIds: string[]
  initialRobotState: StepGeneration.RobotState
  invariantContext: StepGeneration.InvariantContext
}
export const generateRobotStateTimeline = (
  args: GenerateRobotStateTimelineArgs
): StepGeneration.Timeline => {
  console.log('got to generateRobotStateTimeline')
  const {
    allStepArgsAndErrors,
    orderedStepIds,
    initialRobotState,
    invariantContext,
  } = args
  const continuousStepArgs = orderedStepIds.reduce<
    StepGeneration.CommandCreatorArgs[]
  >((acc, stepId) => {
    const { stepArgs } = allStepArgsAndErrors?.[stepId]
    return stepArgs != null ? [...acc, stepArgs] : acc
  }, [])
  const curriedCommandCreators = continuousStepArgs.reduce(
    (
      acc: StepGeneration.CurriedCommandCreator[],
      args: StepGeneration.CommandCreatorArgs,
      stepIndex
    ): StepGeneration.CurriedCommandCreator[] => {
      const curriedCommandCreator = commandCreatorFromStepArgs(args)

      if (curriedCommandCreator === null) {
        // unsupported command creator in args.commandCreatorFnName
        return acc
      }

      // Drop tips eagerly, per pipette
      //
      // - If we don't have a 'changeTip: never' step for this pipette in the future,
      // we know the current tip(s) aren't going to be reused, so we can drop them
      // immediately after the current step is done.
      const pipetteId = StepGeneration.getPipetteIdFromCCArgs(args)
      const dropTipLocation =
        'dropTipLocation' in args ? args.dropTipLocation : null

      //  assume that whenever we have a pipetteId we also have a dropTipLocation
      if (pipetteId != null && dropTipLocation != null) {
        const nextStepArgsForPipette = continuousStepArgs
          .slice(stepIndex + 1)
          .find(
            stepArgs => 'pipette' in stepArgs && stepArgs.pipette === pipetteId
          )
        const willReuseTip =
          nextStepArgsForPipette != null &&
          'changeTip' in nextStepArgsForPipette &&
          nextStepArgsForPipette.changeTip === 'never'

        const isWasteChute =
          invariantContext.additionalEquipmentEntities[dropTipLocation] !=
            null &&
          invariantContext.additionalEquipmentEntities[dropTipLocation].name ===
            'wasteChute'
        const isTrashBin =
          invariantContext.additionalEquipmentEntities[dropTipLocation] !=
            null &&
          invariantContext.additionalEquipmentEntities[dropTipLocation].name ===
            'trashBin'

        const pipetteSpec = invariantContext.pipetteEntities[pipetteId]?.spec
        const addressableAreaName = getWasteChuteAddressableAreaNamePip(
          pipetteSpec.channels
        )

        let dropTipCommands = [
          StepGeneration.curryCommandCreator(StepGeneration.dropTip, {
            pipette: pipetteId,
            dropTipLocation,
          }),
        ]
        if (isWasteChute) {
          dropTipCommands = [
            StepGeneration.curryCommandCreator(moveToAddressableArea, {
              pipetteId,
              addressableAreaName,
            }),
            StepGeneration.curryCommandCreator(dropTipInPlace, {
              pipetteId,
            }),
          ]
        }
        if (isTrashBin) {
          dropTipCommands = movableTrashCommandsUtil({
            type: 'dropTip',
            pipetteId,
            invariantContext,
          })
        }
        if (!willReuseTip) {
          return [
            ...acc,
            (_invariantContext, _prevRobotState) =>
              StepGeneration.reduceCommandCreators(
                [curriedCommandCreator, ...dropTipCommands],
                _invariantContext,
                _prevRobotState
              ),
          ]
        }
      }

      return [...acc, curriedCommandCreator]
    },
    []
  )
  const timeline = StepGeneration.commandCreatorsTimeline(
    curriedCommandCreators,
    invariantContext,
    initialRobotState
  )
  return timeline
}
