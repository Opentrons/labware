import { useCallback, useState } from 'react'
import head from 'lodash/head'

import {
  useResumeRunFromRecoveryMutation,
  useStopRunMutation,
  useUpdateErrorRecoveryPolicy,
} from '@opentrons/react-api-client'

import { useChainRunCommands } from '/app/resources/runs'
import { RECOVERY_MAP } from '../constants'

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
import type {
  CommandData,
  RecoveryPolicyRulesParams,
} from '@opentrons/api-client'
import type { WellGroup } from '@opentrons/components'
import type { FailedCommand, RecoveryRoute, RouteStep } from '../types'
import type { UseFailedLabwareUtilsResult } from './useFailedLabwareUtils'
import type { UseRouteUpdateActionsResult } from './useRouteUpdateActions'
import type { RecoveryToasts } from './useRecoveryToasts'
import type { UseRecoveryAnalyticsResult } from '/app/redux-resources/analytics'
import type { CurrentRecoveryOptionUtils } from './useRecoveryRouting'
import type { ErrorRecoveryFlowsProps } from '../index'

interface UseRecoveryCommandsParams {
  runId: string
  failedCommandByRunRecord: ErrorRecoveryFlowsProps['failedCommandByRunRecord']
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
  homeGripper: () => Promise<CommandData[]>
  /* A non-terminal recovery command */
  moveLabwareWithoutPause: () => Promise<CommandData[]>
}

// TODO(jh, 07-24-24): Create tighter abstractions for terminal vs. non-terminal commands.
// Returns commands with a "fixit" intent. Commands may or may not terminate Error Recovery. See each command docstring for details.
export function useRecoveryCommands({
  runId,
  failedCommandByRunRecord,
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
    failedCommandByRunRecord?.id
  )
  const {
    mutateAsync: resumeRunFromRecovery,
  } = useResumeRunFromRecoveryMutation()
  const { stopRun } = useStopRunMutation()
  const {
    mutateAsync: updateErrorRecoveryPolicy,
  } = useUpdateErrorRecoveryPolicy(runId)
  const { makeSuccessToast } = recoveryToastUtils

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
    const isInPlace = (
      failedCommand: FailedCommand
    ): failedCommand is InPlaceCommand =>
      IN_PLACE_COMMAND_TYPES.includes(
        (failedCommand as InPlaceCommand).commandType
      )
    return failedCommandByRunRecord != null
      ? isInPlace(failedCommandByRunRecord)
        ? failedCommandByRunRecord.error?.isDefined &&
          failedCommandByRunRecord.error?.errorType === 'overpressure' &&
          // Paranoia: this value comes from the wire and may be unevenly implemented
          typeof failedCommandByRunRecord.error?.errorInfo?.retryLocation?.at(
            0
          ) === 'number'
          ? {
              commandType: 'moveToCoordinates',
              intent: 'fixit',
              params: {
                pipetteId: failedCommandByRunRecord.params?.pipetteId,
                coordinates: {
                  x: failedCommandByRunRecord.error.errorInfo.retryLocation[0],
                  y: failedCommandByRunRecord.error.errorInfo.retryLocation[1],
                  z: failedCommandByRunRecord.error.errorInfo.retryLocation[2],
                },
              },
            }
          : null
        : null
      : null
  }

  const retryFailedCommand = useCallback((): Promise<CommandData[]> => {
    const { commandType, params } = failedCommandByRunRecord as FailedCommand // Null case is handled before command could be issued.
    return chainRunRecoveryCommands(
      [
        // move back to the location of the command if it is an in-place command
        buildRetryPrepMove(),
        { commandType, params }, // retry the command that failed
      ].filter(c => c != null) as CreateCommand[]
    ) // the created command is the same command that failed
  }, [chainRunRecoveryCommands, failedCommandByRunRecord?.key])

  // Homes the Z-axis of all attached pipettes.
  const homePipetteZAxes = useCallback((): Promise<CommandData[]> => {
    return chainRunRecoveryCommands([HOME_PIPETTE_Z_AXES])
  }, [chainRunRecoveryCommands])

  // Pick up the user-selected tips
  const pickUpTips = useCallback((): Promise<CommandData[]> => {
    const { selectedTipLocations, failedLabware } = failedLabwareUtils

    const pickUpTipCmd = buildPickUpTips(
      selectedTipLocations,
      failedCommandByRunRecord,
      failedLabware
    )

    if (pickUpTipCmd == null) {
      return Promise.reject(new Error('Invalid use of pickUpTips command'))
    } else {
      return chainRunRecoveryCommands([pickUpTipCmd])
    }
  }, [chainRunRecoveryCommands, failedCommandByRunRecord, failedLabwareUtils])

  const ignoreErrorKindThisRun = (ignoreErrors: boolean): Promise<void> => {
    setIgnoreErrors(ignoreErrors)
    return Promise.resolve()
  }

  // Only send the finalized error policy to the server during a terminal recovery command that does not terminate the run.
  // If the request to update the policy fails, route to the error modal.
  const handleIgnoringErrorKind = useCallback((): Promise<void> => {
    if (ignoreErrors) {
      if (failedCommandByRunRecord?.error != null) {
        const ignorePolicyRules = buildIgnorePolicyRules(
          failedCommandByRunRecord.commandType,
          failedCommandByRunRecord.error.errorType
        )

        return updateErrorRecoveryPolicy(ignorePolicyRules)
          .then(() => Promise.resolve())
          .catch(() =>
            Promise.reject(new Error('Failed to update recovery policy.'))
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
    failedCommandByRunRecord?.error?.errorType,
    failedCommandByRunRecord?.commandType,
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

  const skipFailedCommand = useCallback((): void => {
    void handleIgnoringErrorKind().then(() =>
      resumeRunFromRecovery(runId).then(() => {
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

  const homeGripper = useCallback((): Promise<CommandData[]> => {
    const gripperAxis =
      failedCommandByRunRecord?.error?.errorCode === '2003'
        ? HOME_GRIPPER
        : HOME_GRIPPER_Z_AXIS
    return chainRunRecoveryCommands([gripperAxis])
  }, [chainRunRecoveryCommands])

  const moveLabwareWithoutPause = useCallback((): Promise<CommandData[]> => {
    const moveLabwareCmd = buildMoveLabwareWithoutPause(
      failedCommandByRunRecord
    )
    if (moveLabwareCmd == null) {
      return Promise.reject(new Error('Invalid use of MoveLabware command'))
    } else {
      return chainRunRecoveryCommands([moveLabwareCmd])
    }
  }, [chainRunRecoveryCommands, failedCommandByRunRecord])

  return {
    resumeRun,
    cancelRun,
    retryFailedCommand,
    homePipetteZAxes,
    pickUpTips,
    releaseGripperJaws,
    homeGripper,
    moveLabwareWithoutPause,
    skipFailedCommand,
    ignoreErrorKindThisRun,
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

export const HOME_GRIPPER_Z_AXIS: CreateCommand = {
  commandType: 'home',
  params: { axes: ['extensionZ'] },
  intent: 'fixit',
}

export const HOME_GRIPPER: CreateCommand = {
  commandType: 'home',
  params: { axes: ['extensionZ', 'extensionJaw'] },
  intent: 'fixit',
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
  errorType: string
): RecoveryPolicyRulesParams => {
  return [
    {
      commandType,
      errorType,
      ifMatch: 'ignoreAndContinue',
    },
  ]
}
