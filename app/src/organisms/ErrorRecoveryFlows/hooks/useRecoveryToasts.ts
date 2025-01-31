import { useTranslation } from 'react-i18next'

import { useToaster } from '../../ToasterOven'
import { RECOVERY_MAP } from '../constants'
import { useCommandTextString } from '/app/local-resources/commands'

import type { StepCounts } from '/app/resources/protocols/hooks'
import type { CurrentRecoveryOptionUtils } from './useRecoveryRouting'
import type { UseCommandTextStringParams } from '/app/local-resources/commands'

export type BuildToast = Omit<UseCommandTextStringParams, 'command'> & {
  isOnDevice: boolean
  stepCounts: StepCounts
  selectedRecoveryOption: CurrentRecoveryOptionUtils['selectedRecoveryOption']
}

export interface RecoveryToasts {
  /* Renders a recovery success toast. */
  makeSuccessToast: () => void
}

// Provides methods for rendering success/failure toasts after performing a terminal recovery command.
export function useRecoveryToasts({
  stepCounts,
  isOnDevice,
  selectedRecoveryOption,
  ...rest
}: BuildToast): RecoveryToasts {
  const { currentStepNumber, hasRunDiverged } = stepCounts
  const { makeToast } = useToaster()
  const displayType = isOnDevice ? 'odd' : 'desktop'

  const stepNumber = getStepNumber(selectedRecoveryOption, currentStepNumber)

  const desktopFullCommandText = useRecoveryFullCommandText({
    ...rest,
    stepNumber,
  })
  const recoveryToastText = useRecoveryToastText({
    stepNumber,
    selectedRecoveryOption,
  })

  // The "body" of the toast message.  On desktop, this is the full command text, if present. Otherwise, this is the recovery-specific text.
  const bodyText =
    displayType === 'desktop' && desktopFullCommandText != null
      ? desktopFullCommandText
      : recoveryToastText
  // The "heading" of the toast message. Currently, this text is only present on the desktop toasts.
  const headingText =
    displayType === 'desktop' && !hasRunDiverged ? recoveryToastText : undefined

  const makeSuccessToast = (): void => {
    if (selectedRecoveryOption !== RECOVERY_MAP.CANCEL_RUN.ROUTE) {
      makeToast(bodyText, 'success', {
        closeButton: true,
        disableTimeout: true,
        displayType,
        heading: headingText,
      })
    }
  }

  return { makeSuccessToast }
}

// Return i18n toast text for the corresponding user selected recovery option.
// Ex: "Skip to step <###> succeeded."
export function useRecoveryToastText({
  stepNumber,
  selectedRecoveryOption,
}: {
  stepNumber: ReturnType<typeof getStepNumber>
  selectedRecoveryOption: CurrentRecoveryOptionUtils['selectedRecoveryOption']
}): string {
  const { t } = useTranslation('error_recovery')

  const currentStepReturnVal =
    stepNumber != null
      ? t('retrying_step_succeeded', {
          step: stepNumber,
        })
      : t('retrying_step_succeeded_na')
  const nextStepReturnVal =
    stepNumber != null
      ? t('skipping_to_step_succeeded', {
          step: stepNumber,
        })
      : t('skipping_to_step_succeeded_na')

  const toastText = handleRecoveryOptionAction(
    selectedRecoveryOption,
    currentStepReturnVal,
    nextStepReturnVal
  )

  return toastText
}

type UseRecoveryFullCommandTextParams = Omit<
  UseCommandTextStringParams,
  'command'
> & {
  stepNumber: ReturnType<typeof getStepNumber>
}

// Return the full command text of the recovery command that is "retried" or "skipped".
export function useRecoveryFullCommandText(
  props: UseRecoveryFullCommandTextParams
): string | null {
  const { commandTextData, stepNumber } = props

  // TODO TOME: I think you are looking one command to far, for some reason.
  const relevantCmdIdx = stepNumber ?? -1
  const relevantCmd = commandTextData?.commands[relevantCmdIdx - 1] ?? null

  const { commandText, kind } = useCommandTextString({
    ...props,
    command: relevantCmd,
  })

  if (stepNumber == null) {
    return null
  }
  // Occurs when the relevantCmd doesn't exist, ex, we "skip" the last command of a run.
  else if (relevantCmd === null) {
    return null
  } else {
    return truncateIfTCCommand(
      commandText,
      ['thermocycler/runProfile', 'thermocycler/runExtendedProfile'].includes(
        kind
      )
    )
  }
}

// Return the user-facing step number, 0 indexed. If the step number cannot be determined, return '?'.
export function getStepNumber(
  selectedRecoveryOption: BuildToast['selectedRecoveryOption'],
  currentStepCount: BuildToast['stepCounts']['currentStepNumber']
): number | null {
  const currentStepReturnVal = currentStepCount ?? null
  // There is always a next protocol step after a command that can error, therefore, we don't need to handle that.
  const nextStepReturnVal =
    typeof currentStepCount === 'number' ? currentStepCount + 1 : null

  return handleRecoveryOptionAction(
    selectedRecoveryOption,
    currentStepReturnVal,
    nextStepReturnVal
  )
}

// Recovery options can be categorized into broad categories of behavior, currently performing the same step again
// or skipping to the next step.
function handleRecoveryOptionAction<T>(
  selectedRecoveryOption: CurrentRecoveryOptionUtils['selectedRecoveryOption'],
  currentStepReturnVal: T,
  nextStepReturnVal: T
): T | null {
  switch (selectedRecoveryOption) {
    case RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE:
    case RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE:
    case RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE:
    case RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE:
    case RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE:
      return nextStepReturnVal
    case RECOVERY_MAP.CANCEL_RUN.ROUTE:
    case RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE:
    case RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE:
    case RECOVERY_MAP.RETRY_STEP.ROUTE:
    case RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE:
    case RECOVERY_MAP.HOME_AND_RETRY.ROUTE:
      return currentStepReturnVal
    default: {
      return null
    }
  }
}

// Special case the TC text, so it make sense in a success toast.
function truncateIfTCCommand(
  commandText: string,
  isTCCommand: boolean
): string {
  if (isTCCommand) {
    const indexOfProfile = commandText.indexOf('steps')

    if (indexOfProfile === -1) {
      console.warn(
        'TC cycle text has changed. Update Error Recovery TC text utility.'
      )
    }

    return commandText.slice(0, indexOfProfile + 5) // +5 to include "steps"
  } else {
    return commandText
  }
}
