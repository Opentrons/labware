import last from 'lodash/last'
import { getNextRobotStateAndWarningsSingleCommand } from '../getNextRobotStateAndWarnings'
import { stripNoOpCommands } from './stripNoOpCommands'
import type {
  InvariantContext,
  RobotState,
  Timeline,
  CurriedCommandCreator,
  RobotStateAndWarnings,
} from '../types'
export const commandCreatorsTimeline = (
  commandCreators: CurriedCommandCreator[],
  invariantContext: InvariantContext,
  initialRobotState: RobotState
): Timeline => {
  const timeline = commandCreators.reduce(
    (acc: Timeline, commandCreator: CurriedCommandCreator, index: number) => {
      const prevRobotState =
        acc.timeline.length === 0
          ? initialRobotState
          : // @ts-expect-error(SA, 2021-05-03): last might return undefined
            last(acc.timeline).robotState

      if (acc.errors != null) {
        // error short-circuit
        return acc
      }

      const commandCreatorResult = commandCreator(
        invariantContext,
        prevRobotState
      )
      if ('errors' in commandCreatorResult) {
        return {
          timeline: acc.timeline,
          errors: commandCreatorResult.errors,
        }
      }
      const strippedCommands = stripNoOpCommands(commandCreatorResult.commands)
      const nextRobotStateAndWarnings = strippedCommands.reduce(
        (acc: RobotStateAndWarnings, command) =>
          getNextRobotStateAndWarningsSingleCommand(
            command,
            invariantContext,
            acc.robotState
          ),
        {
          robotState: prevRobotState,
          warnings: [],
        }
      )
      const nextResult = {
        commands: commandCreatorResult.commands,
        robotState: nextRobotStateAndWarnings.robotState,
        warnings: commandCreatorResult.warnings,
        python: commandCreatorResult.python,
      }
      return {
        timeline: [...acc.timeline, nextResult],
        errors: null,
      }
    },
    {
      timeline: [],
      errors: null,
    }
  )
  return {
    timeline: timeline.timeline,
    errors: timeline.errors,
  }
}
