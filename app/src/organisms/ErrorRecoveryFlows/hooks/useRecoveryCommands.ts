import { useCallback, useState } from 'react'
import head from 'lodash/head'

import {
  useResumeRunFromRecoveryMutation,
  useStopRunMutation,
  useResumeRunFromRecoveryAssumingFalsePositiveMutation,
} from '@opentrons/react-api-client'

import {
  useChainRunCommands,
  useUpdateRecoveryPolicyWithStrategy,
} from '/app/resources/runs'
import { DEFINED_ERROR_TYPES, ERROR_KINDS, RECOVERY_MAP } from '../constants'
import { getErrorKind } from '/app/organisms/ErrorRecoveryFlows/utils'

import type {
  CreateCommand,
  LoadedLabware,
  MoveToCoordinatesCreateCommand,
  AspirateInPlaceRunTimeCommand,
  BlowoutInPlaceRunTimeCommand,
  DispenseInPlaceRunTimeCommand,
  DropTipInPlaceRunTimeCommand,
  PrepareToAspirateRunTimeCommand,
  MoveLabwareParams,
} from '@opentrons/shared-data'
import type { CommandData, IfMatchType, RunAction } from '@opentrons/api-client'
import type { WellGroup } from '@opentrons/components'
import type { FailedCommand, RecoveryRoute, RouteStep } from '../types'
import type { UseFailedLabwareUtilsResult } from './useFailedLabwareUtils'
import type { UseRouteUpdateActionsResult } from './useRouteUpdateActions'
import type { RecoveryToasts } from './useRecoveryToasts'
import type { UseRecoveryAnalyticsResult } from '/app/redux-resources/analytics'
import type { CurrentRecoveryOptionUtils } from './useRecoveryRouting'
import type { ErrorRecoveryFlowsProps } from '..'
import type { FailedCommandBySource } from './useRetainedFailedCommandBySource'
import type { UpdateErrorRecoveryPolicyWithStrategy } from '/app/resources/runs'

interface UseRecoveryCommandsParams {
  runId: string
  failedCommand: FailedCommandBySource | null
  unvalidatedFailedCommand: ErrorRecoveryFlowsProps['unvalidatedFailedCommand']
  failedLabwareUtils: UseFailedLabwareUtilsResult
  routeUpdateActions: UseRouteUpdateActionsResult
  recoveryToastUtils: RecoveryToasts
  analytics: UseRecoveryAnalyticsResult<RecoveryRoute, RouteStep>
  selectedRecoveryOption: CurrentRecoveryOptionUtils['selectedRecoveryOption']
}
export interface UseRecoveryCommandsResult {
  /* A terminal recovery command that causes ER to exit as the run status becomes "running" */
  resumeRun: () => void
  /* A terminal recovery command that causes ER to exit as the run status becomes "stop-requested" */
  cancelRun: () => void
  /* A terminal recovery command, that causes ER to exit as the run status becomes "running" */
  skipFailedCommand: () => void
  /* A non-terminal recovery command. Ignore this errorKind for the rest of this run.
   * The server is not informed of recovery policy changes until a terminal recovery command occurs that does not result
   * in termination of the run. */
  ignoreErrorKindThisRun: (ignoreErrors: boolean) => Promise<void>
  /* A non-terminal recovery command */
  retryFailedCommand: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  homePipetteZAxes: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  pickUpTips: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  releaseGripperJaws: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  homeExceptPlungers: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  moveLabwareWithoutPause: () => Promise<CommandData[]>
  /* A non-terminal recovery-command */
  homeAll: () => Promise<CommandData[]>
}

// TODO(jh, 07-24-24): Create tighter abstractions for terminal vs. non-terminal commands.
// Returns commands with a "fixit" intent. Commands may or may not terminate Error Recovery. See each command docstring for details.
export function useRecoveryCommands({
  runId,
  failedCommand,
  unvalidatedFailedCommand,
  failedLabwareUtils,
  routeUpdateActions,
  recoveryToastUtils,
  analytics,
  selectedRecoveryOption,
}: UseRecoveryCommandsParams): UseRecoveryCommandsResult {
  const [ignoreErrors, setIgnoreErrors] = useState(false)

  const { proceedToRouteAndStep } = routeUpdateActions
  const { chainRunCommands } = useChainRunCommands(
    runId,
    unvalidatedFailedCommand?.id
  )
  const {
    mutateAsync: resumeRunFromRecovery,
  } = useResumeRunFromRecoveryMutation()
  const {
    mutateAsync: resumeRunFromRecoveryAssumingFalsePositive,
  } = useResumeRunFromRecoveryAssumingFalsePositiveMutation()
  const { stopRun } = useStopRunMutation()
  const updateErrorRecoveryPolicy = useUpdateRecoveryPolicyWithStrategy(runId)
  const { makeSuccessToast } = recoveryToastUtils

  // TODO(jh, 11-21-24): Some commands return a 200 with an error body. We should catch these and propagate the error.
  const chainRunRecoveryCommands = useCallback(
    (
      commands: CreateCommand[],
      continuePastFailure: boolean = false
    ): Promise<CommandData[]> =>
      chainRunCommands(commands, continuePastFailure).catch(e => {
        console.warn(`Error executing "fixit" command: ${e}`)
        analytics.reportActionSelectedResult(selectedRecoveryOption, 'failed')
        // the catch never occurs if continuePastCommandFailure is "true"
        void proceedToRouteAndStep(RECOVERY_MAP.ERROR_WHILE_RECOVERING.ROUTE)
        return Promise.reject(new Error(`Could not execute command: ${e}`))
      }),
    [analytics, selectedRecoveryOption]
  )

  const buildRetryPrepMove = (): MoveToCoordinatesCreateCommand | null => {
    type InPlaceCommand =
      | AspirateInPlaceRunTimeCommand
      | BlowoutInPlaceRunTimeCommand
      | DispenseInPlaceRunTimeCommand
      | DropTipInPlaceRunTimeCommand
      | PrepareToAspirateRunTimeCommand

    const IN_PLACE_COMMAND_TYPES = [
      'aspirateInPlace',
      'dispenseInPlace',
      'blowOutInPlace',
      'dropTipInPlace',
      'prepareToAspirate',
    ] as const

    const RETRY_ERROR_TYPES = [
      DEFINED_ERROR_TYPES.OVERPRESSURE,
      DEFINED_ERROR_TYPES.TIP_PHYSICALLY_ATTACHED,
    ] as const

    const isInPlace = (
      failedCommand: FailedCommand
    ): failedCommand is InPlaceCommand =>
      IN_PLACE_COMMAND_TYPES.includes(
        (failedCommand as InPlaceCommand).commandType
      )

    return unvalidatedFailedCommand != null
      ? isInPlace(unvalidatedFailedCommand)
        ? unvalidatedFailedCommand.error?.isDefined &&
          RETRY_ERROR_TYPES.includes(
            unvalidatedFailedCommand.error?.errorType
          ) &&
          // Paranoia: this value comes from the wire and may be unevenly implemented
          typeof unvalidatedFailedCommand.error?.errorInfo?.retryLocation?.at(
            0
          ) === 'number'
          ? {
              commandType: 'moveToCoordinates',
              intent: 'fixit',
              params: {
                pipetteId: unvalidatedFailedCommand.params?.pipetteId,
                coordinates: {
                  x: unvalidatedFailedCommand.error.errorInfo.retryLocation[0],
                  y: unvalidatedFailedCommand.error.errorInfo.retryLocation[1],
                  z: unvalidatedFailedCommand.error.errorInfo.retryLocation[2],
                },
              },
            }
          : null
        : null
      : null
  }

  const retryFailedCommand = useCallback((): Promise<CommandData[]> => {
    const { commandType, params } = unvalidatedFailedCommand as FailedCommand // Null case is handled before command could be issued.
    return chainRunRecoveryCommands(
      [
        // move back to the location of the command if it is an in-place command
        buildRetryPrepMove(),
        { commandType, params }, // retry the command that failed
      ].filter(c => c != null) as CreateCommand[]
    ) // the created command is the same command that failed
  }, [chainRunRecoveryCommands, unvalidatedFailedCommand?.key])

  // Homes the Z-axis of all attached pipettes.
  const homePipetteZAxes = useCallback((): Promise<CommandData[]> => {
    return chainRunRecoveryCommands([HOME_PIPETTE_Z_AXES])
  }, [chainRunRecoveryCommands])

  // Pick up the user-selected tips
  const pickUpTips = useCallback((): Promise<CommandData[]> => {
    const { selectedTipLocations, failedLabware } = failedLabwareUtils

    const pickUpTipCmd = buildPickUpTips(
      selectedTipLocations,
      unvalidatedFailedCommand,
      failedLabware
    )

    if (pickUpTipCmd == null) {
      return Promise.reject(new Error('Invalid use of pickUpTips command'))
    } else {
      return chainRunRecoveryCommands([pickUpTipCmd])
    }
  }, [chainRunRecoveryCommands, unvalidatedFailedCommand, failedLabwareUtils])

  const ignoreErrorKindThisRun = (ignoreErrors: boolean): Promise<void> => {
    setIgnoreErrors(ignoreErrors)
    return Promise.resolve()
  }

  // Only send the finalized error policy to the server during a terminal recovery command that does not terminate the run.
  // If the request to update the policy fails, route to the error modal.
  const handleIgnoringErrorKind = useCallback((): Promise<void> => {
    if (ignoreErrors) {
      if (unvalidatedFailedCommand?.error != null) {
        const ifMatch: IfMatchType = isAssumeFalsePositiveResumeKind(
          failedCommand
        )
          ? 'assumeFalsePositiveAndContinue'
          : 'ignoreAndContinue'

        const ignorePolicyRules = buildIgnorePolicyRules(
          unvalidatedFailedCommand.commandType,
          unvalidatedFailedCommand.error.errorType,
          ifMatch
        )

        return updateErrorRecoveryPolicy(ignorePolicyRules, 'append')
          .then(() => Promise.resolve())
          .catch((e: Error) =>
            Promise.reject(
              new Error(`Failed to update recovery policy: ${e.message}`)
            )
          )
      } else {
        void proceedToRouteAndStep(RECOVERY_MAP.ERROR_WHILE_RECOVERING.ROUTE)
        return Promise.reject(
          new Error('Could not execute command. No failed command.')
        )
      }
    } else {
      return Promise.resolve()
    }
  }, [
    unvalidatedFailedCommand?.error?.errorType,
    unvalidatedFailedCommand?.commandType,
    ignoreErrors,
  ])

  const resumeRun = useCallback((): void => {
    void handleIgnoringErrorKind()
      .then(() => resumeRunFromRecovery(runId))
      .then(() => {
        analytics.reportActionSelectedResult(
          selectedRecoveryOption,
          'succeeded'
        )
        makeSuccessToast()
      })
  }, [
    runId,
    ignoreErrors,
    resumeRunFromRecovery,
    handleIgnoringErrorKind,
    selectedRecoveryOption,
    makeSuccessToast,
  ])

  const cancelRun = useCallback((): void => {
    analytics.reportActionSelectedResult(selectedRecoveryOption, 'succeeded')
    stopRun(runId)
  }, [runId])

  const handleResumeAction = (): Promise<RunAction> => {
    if (isAssumeFalsePositiveResumeKind(failedCommand)) {
      return resumeRunFromRecoveryAssumingFalsePositive(runId)
    } else {
      return resumeRunFromRecovery(runId)
    }
  }

  const skipFailedCommand = useCallback((): void => {
    void handleIgnoringErrorKind().then(() =>
      handleResumeAction().then(() => {
        analytics.reportActionSelectedResult(
          selectedRecoveryOption,
          'succeeded'
        )
        makeSuccessToast()
      })
    )
  }, [
    runId,
    resumeRunFromRecovery,
    handleIgnoringErrorKind,
    selectedRecoveryOption,
    makeSuccessToast,
  ])

  const releaseGripperJaws = useCallback((): Promise<CommandData[]> => {
    return chainRunRecoveryCommands([RELEASE_GRIPPER_JAW])
  }, [chainRunRecoveryCommands])

  const homeExceptPlungers = useCallback((): Promise<CommandData[]> => {
    return chainRunRecoveryCommands([HOME_EXCEPT_PLUNGERS])
  }, [chainRunRecoveryCommands])

  const homeAll = useCallback((): Promise<CommandData[]> => {
    return chainRunRecoveryCommands([HOME_ALL])
  }, [chainRunRecoveryCommands])

  const moveLabwareWithoutPause = useCallback((): Promise<CommandData[]> => {
    const moveLabwareCmd = buildMoveLabwareWithoutPause(
      unvalidatedFailedCommand
    )
    if (moveLabwareCmd == null) {
      return Promise.reject(new Error('Invalid use of MoveLabware command'))
    } else {
      return chainRunRecoveryCommands([moveLabwareCmd])
    }
  }, [chainRunRecoveryCommands, unvalidatedFailedCommand])

  return {
    resumeRun,
    cancelRun,
    retryFailedCommand,
    homePipetteZAxes,
    pickUpTips,
    releaseGripperJaws,
    homeExceptPlungers,
    moveLabwareWithoutPause,
    skipFailedCommand,
    ignoreErrorKindThisRun,
    homeAll,
  }
}

export function isAssumeFalsePositiveResumeKind(
  failedCommand: UseRecoveryCommandsParams['failedCommand']
): boolean {
  const errorKind = getErrorKind(failedCommand)

  switch (errorKind) {
    case ERROR_KINDS.TIP_NOT_DETECTED:
    case ERROR_KINDS.TIP_DROP_FAILED:
      return true
    default:
      return false
  }
}

export const HOME_PIPETTE_Z_AXES: CreateCommand = {
  commandType: 'home',
  params: { axes: ['leftZ', 'rightZ'] },
  intent: 'fixit',
}

export const RELEASE_GRIPPER_JAW: CreateCommand = {
  commandType: 'unsafe/ungripLabware',
  params: {},
  intent: 'fixit',
}

// in case the gripper does not know the position after a stall/collision we must update the position.
export const UPDATE_ESTIMATORS_EXCEPT_PLUNGERS: CreateCommand = {
  commandType: 'unsafe/updatePositionEstimators',
  params: { axes: ['x', 'y', 'extensionZ'] },
}

export const HOME_EXCEPT_PLUNGERS: CreateCommand = {
  commandType: 'home',
  params: {
    axes: ['extensionJaw', 'extensionZ', 'leftZ', 'rightZ', 'x', 'y'],
  },
}

export const HOME_ALL: CreateCommand = {
  commandType: 'home',
  params: {},
}

const buildMoveLabwareWithoutPause = (
  failedCommand: FailedCommand | null
): CreateCommand | null => {
  if (failedCommand == null) {
    return null
  }
  const moveLabwareParams = failedCommand.params as MoveLabwareParams
  return {
    commandType: 'moveLabware',
    params: {
      labwareId: moveLabwareParams.labwareId,
      newLocation: moveLabwareParams.newLocation,
      strategy: 'manualMoveWithoutPause',
    },
    intent: 'fixit',
  }
}

export const buildPickUpTips = (
  tipGroup: WellGroup | null,
  failedCommand: FailedCommand | null,
  labware: LoadedLabware | null
): CreateCommand | null => {
  if (
    failedCommand == null ||
    labware === null ||
    tipGroup == null ||
    !('pipetteId' in failedCommand.params)
  ) {
    return null
  } else {
    const wellName = head(Object.keys(tipGroup)) as string

    return {
      commandType: 'pickUpTip',
      params: {
        labwareId: labware.id,
        pipetteId: failedCommand.params.pipetteId,
        wellName,
      },
    }
  }
}

export const buildIgnorePolicyRules = (
  commandType: FailedCommand['commandType'],
  errorType: string,
  ifMatch: IfMatchType
): UpdateErrorRecoveryPolicyWithStrategy['newPolicy'] => ({
  commandType,
  errorType,
  ifMatch,
})
