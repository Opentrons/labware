import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import { CURSOR_POINTER, StyledText } from '@opentrons/components'

import { RecoveryError } from './RecoveryError'
import { RecoveryDoorOpen } from './RecoveryDoorOpen'
import {
  SelectRecoveryOption,
  RetryStep,
  CancelRun,
  RetryNewTips,
  ManageTips,
  FillWellAndSkip,
  RetrySameTips,
  SkipStepSameTips,
  SkipStepNewTips,
  IgnoreErrorSkipStep,
  ManualMoveLwAndSkip,
  ManualReplaceLwAndRetry,
  HomeAndRetry,
} from './RecoveryOptions'
import {
  useErrorDetailsModal,
  ErrorDetailsModal,
  RecoveryInterventionModal,
  RecoveryDoorOpenSpecial,
} from './shared'
import { RecoveryInProgress } from './RecoveryInProgress'
import { getErrorKind } from './utils'
import { RECOVERY_MAP } from './constants'

import type { LabwareDefinition2, RobotType } from '@opentrons/shared-data'
import type { RecoveryRoute, RouteStep, RecoveryContentProps } from './types'
import type { ErrorRecoveryFlowsProps } from '.'
import type { UseRecoveryAnalyticsResult } from '/app/redux-resources/analytics'
import type { ERUtilsResults, useRetainedFailedCommandBySource } from './hooks'

export interface UseERWizardResult {
  hasLaunchedRecovery: boolean
  showERWizard: boolean
  toggleERWizard: (isActive: boolean, hasLaunchedER?: boolean) => Promise<void>
}

export function useERWizard(): UseERWizardResult {
  const [showERWizard, setShowERWizard] = useState(false)
  // Because RunPausedSplash has access to some ER Wiz routes but is not a part of the ER wizard, the splash screen
  // is the "home" route as opposed to SelectRecoveryOption (accessed by pressing "go back" or "continue" enough times)
  // when recovery mode has not been launched.
  const [hasLaunchedRecovery, setHasLaunchedRecovery] = useState(false)

  const toggleERWizard = (
    isActive: boolean,
    hasLaunchedER?: boolean
  ): Promise<void> => {
    if (hasLaunchedER !== undefined) {
      setHasLaunchedRecovery(hasLaunchedER)
    }
    setShowERWizard(isActive)
    return Promise.resolve()
  }

  return { showERWizard, toggleERWizard, hasLaunchedRecovery }
}

export type ErrorRecoveryWizardProps = ErrorRecoveryFlowsProps &
  ERUtilsResults & {
    robotType: RobotType
    isOnDevice: boolean
    analytics: UseRecoveryAnalyticsResult<RecoveryRoute, RouteStep>
    failedCommand: ReturnType<typeof useRetainedFailedCommandBySource>
    allRunDefs: LabwareDefinition2[]
  }

export function ErrorRecoveryWizard(
  props: ErrorRecoveryWizardProps
): JSX.Element {
  return (
    <ErrorRecoveryComponent
      errorKind={getErrorKind(props.failedCommand)}
      {...props}
    />
  )
}

export function ErrorRecoveryComponent(
  props: RecoveryContentProps
): JSX.Element {
  const {
    recoveryMap,
    hasLaunchedRecovery,
    doorStatusUtils,
    isOnDevice,
    analytics,
  } = props
  const { isProhibitedDoorOpen } = doorStatusUtils
  const { route, step } = recoveryMap
  const { t } = useTranslation('error_recovery')
  const { showModal, toggleModal } = useErrorDetailsModal()

  useEffect(() => {
    if (showModal) {
      analytics.reportViewErrorDetailsEvent(route, step)
    }
  }, [analytics, route, showModal, step])

  const buildTitleHeading = (): JSX.Element => {
    const titleText = hasLaunchedRecovery ? t('recovery_mode') : t('cancel_run')
    return (
      <StyledText oddStyle="level4HeaderBold" desktopStyle="bodyLargeSemiBold">
        {titleText}
      </StyledText>
    )
  }

  const buildIconHeading = (): JSX.Element => (
    <StyledText
      oddStyle="bodyTextSemiBold"
      desktopStyle="bodyDefaultSemiBold"
      css={css`
        cursor: ${CURSOR_POINTER};
      `}
    >
      {t('view_error_details')}
    </StyledText>
  )

  const buildInterventionContent = (): JSX.Element => {
    if (isProhibitedDoorOpen) {
      return <RecoveryDoorOpen {...props} />
    } else {
      return <ErrorRecoveryContent {...props} />
    }
  }

  const isLargeDesktopStyle =
    !isProhibitedDoorOpen &&
    route === RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE &&
    step !== RECOVERY_MAP.DROP_TIP_FLOWS.STEPS.BEGIN_REMOVAL
  const desktopType = isLargeDesktopStyle ? 'desktop-large' : 'desktop-small'

  return (
    <RecoveryInterventionModal
      iconHeading={buildIconHeading()}
      titleHeading={buildTitleHeading()}
      iconHeadingOnClick={toggleModal}
      iconName="information"
      desktopType={desktopType}
      isOnDevice={isOnDevice}
    >
      {showModal ? (
        <ErrorDetailsModal
          {...props}
          toggleModal={toggleModal}
          desktopType={desktopType}
        />
      ) : null}
      {buildInterventionContent()}
    </RecoveryInterventionModal>
  )
}

export function ErrorRecoveryContent(props: RecoveryContentProps): JSX.Element {
  const buildSelectRecoveryOption = (): JSX.Element => {
    return <SelectRecoveryOption {...props} />
  }

  const buildRecoveryError = (): JSX.Element => {
    return <RecoveryError {...props} />
  }

  const buildRecoveryInProgress = (): JSX.Element => {
    return <RecoveryInProgress {...props} />
  }

  const buildRetryStep = (): JSX.Element => {
    return <RetryStep {...props} />
  }

  const buildCancelRun = (): JSX.Element => {
    return <CancelRun {...props} />
  }

  const buildManageTips = (): JSX.Element => {
    return <ManageTips {...props} />
  }

  const buildRetryNewTips = (): JSX.Element => {
    return <RetryNewTips {...props} />
  }

  const buildRetrySameTips = (): JSX.Element => {
    return <RetrySameTips {...props} />
  }

  const buildFillWellAndSkip = (): JSX.Element => {
    return <FillWellAndSkip {...props} />
  }

  const buildSkipStepSameTips = (): JSX.Element => {
    return <SkipStepSameTips {...props} />
  }

  const buildSkipStepNewTips = (): JSX.Element => {
    return <SkipStepNewTips {...props} />
  }

  const buildIgnoreErrorSkipStep = (): JSX.Element => {
    return <IgnoreErrorSkipStep {...props} />
  }

  const buildManualMoveLwAndSkip = (): JSX.Element => {
    return <ManualMoveLwAndSkip {...props} />
  }

  const buildManualReplaceLwAndRetry = (): JSX.Element => {
    return <ManualReplaceLwAndRetry {...props} />
  }

  const buildManuallyRouteToDoorOpen = (): JSX.Element => {
    return <RecoveryDoorOpen {...props} />
  }

  const buildRecoveryDoorOpenSpecial = (): JSX.Element => {
    return <RecoveryDoorOpenSpecial {...props} />
  }

  const buildHomeAndRetry = (): JSX.Element => {
    return <HomeAndRetry {...props} />
  }

  switch (props.recoveryMap.route) {
    case RECOVERY_MAP.OPTION_SELECTION.ROUTE:
      return buildSelectRecoveryOption()
    case RECOVERY_MAP.ERROR_WHILE_RECOVERING.ROUTE:
      return buildRecoveryError()
    case RECOVERY_MAP.RETRY_STEP.ROUTE:
      return buildRetryStep()
    case RECOVERY_MAP.CANCEL_RUN.ROUTE:
      return buildCancelRun()
    case RECOVERY_MAP.DROP_TIP_FLOWS.ROUTE:
      return buildManageTips()
    case RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE:
      return buildRetryNewTips()
    case RECOVERY_MAP.RETRY_SAME_TIPS.ROUTE:
      return buildRetrySameTips()
    case RECOVERY_MAP.MANUAL_FILL_AND_SKIP.ROUTE:
      return buildFillWellAndSkip()
    case RECOVERY_MAP.SKIP_STEP_WITH_SAME_TIPS.ROUTE:
      return buildSkipStepSameTips()
    case RECOVERY_MAP.SKIP_STEP_WITH_NEW_TIPS.ROUTE:
      return buildSkipStepNewTips()
    case RECOVERY_MAP.IGNORE_AND_SKIP.ROUTE:
      return buildIgnoreErrorSkipStep()
    case RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE:
      return buildManualMoveLwAndSkip()
    case RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE:
      return buildManualReplaceLwAndRetry()
    case RECOVERY_MAP.ROBOT_DOOR_OPEN_SPECIAL.ROUTE:
      return buildRecoveryDoorOpenSpecial()
    case RECOVERY_MAP.ROBOT_IN_MOTION.ROUTE:
    case RECOVERY_MAP.ROBOT_RESUMING.ROUTE:
    case RECOVERY_MAP.ROBOT_RETRYING_STEP.ROUTE:
    case RECOVERY_MAP.ROBOT_CANCELING.ROUTE:
    case RECOVERY_MAP.ROBOT_PICKING_UP_TIPS.ROUTE:
    case RECOVERY_MAP.ROBOT_SKIPPING_STEP.ROUTE:
    case RECOVERY_MAP.ROBOT_RELEASING_LABWARE.ROUTE:
      return buildRecoveryInProgress()
    case RECOVERY_MAP.ROBOT_DOOR_OPEN.ROUTE:
      return buildManuallyRouteToDoorOpen()
    case RECOVERY_MAP.HOME_AND_RETRY.ROUTE:
      return buildHomeAndRetry()
    default:
      return buildSelectRecoveryOption()
  }
}
