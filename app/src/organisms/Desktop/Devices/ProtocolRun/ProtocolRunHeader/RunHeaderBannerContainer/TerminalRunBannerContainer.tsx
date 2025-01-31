import { useTranslation } from 'react-i18next'

import {
  SPACING,
  TYPOGRAPHY,
  Banner,
  JUSTIFY_SPACE_BETWEEN,
  Flex,
  StyledText,
  Link,
  ALIGN_CENTER,
} from '@opentrons/components'
import { RUN_STATUS_STOPPED, RUN_STATUS_SUCCEEDED } from '@opentrons/api-client'
import {
  useCloseCurrentRun,
  useIsRunCurrent,
  useMostRecentRunId,
} from '/app/resources/runs'

import type { RunHeaderBannerContainerProps } from '.'

type TerminalBannerType = 'success' | 'error' | null

// Determine which terminal banner to render, if any.
export function useTerminalRunBannerContainer({
  runId,
  runStatus,
  isResetRunLoading,
  runErrors,
  enteredER,
}: RunHeaderBannerContainerProps): TerminalBannerType {
  const { highestPriorityError, commandErrorList } = runErrors

  const isRunCurrent = useIsRunCurrent(runId)
  const mostRecentRunId = useMostRecentRunId()

  const isMostRecentRun = mostRecentRunId === runId
  const cancelledWithoutRecovery =
    !enteredER && runStatus === RUN_STATUS_STOPPED
  const completedWithErrors =
    (commandErrorList != null && commandErrorList.length > 0) ||
    highestPriorityError != null
  // TODO(jh, 01-10-25): Adding /commandErrors to notifications accomplishes the below with reduced latency.
  const completedWithNoErrors =
    commandErrorList != null && commandErrorList.length === 0

  const showSuccessBanner =
    runStatus === RUN_STATUS_SUCCEEDED &&
    isRunCurrent &&
    !isResetRunLoading &&
    completedWithNoErrors

  // TODO(jh, 08-14-24): Ideally, the backend never returns the "user cancelled a run" error and
  //  cancelledWithoutRecovery becomes unnecessary.
  const showErrorBanner =
    isMostRecentRun &&
    !cancelledWithoutRecovery &&
    !isResetRunLoading &&
    completedWithErrors

  if (showSuccessBanner) {
    return 'success'
  } else if (showErrorBanner) {
    return 'error'
  } else {
    return null
  }
}

interface TerminalRunBannerContainerProps
  extends RunHeaderBannerContainerProps {
  bannerType: TerminalBannerType
}

// Contains all possible banners that render after the run reaches a terminal run status.
export function TerminalRunBannerContainer(
  props: TerminalRunBannerContainerProps
): JSX.Element {
  const { bannerType } = props

  switch (bannerType) {
    case 'success':
      return <ProtocolRunSuccessBanner />
    case 'error':
      return <ProtocolRunErrorBanner {...props} />
    default:
      console.error('Handle banner cases explicitly.')
      return <div />
  }
}

function ProtocolRunSuccessBanner(): JSX.Element {
  const { t } = useTranslation('run_details')

  const { closeCurrentRun, isClosingCurrentRun } = useCloseCurrentRun()

  const handleRunSuccessClick = (): void => {
    closeCurrentRun()
  }

  return (
    <Banner
      type="success"
      onCloseClick={handleRunSuccessClick}
      isCloseActionLoading={isClosingCurrentRun}
      iconMarginLeft={SPACING.spacing4}
    >
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="100%">
        {t('run_completed')}
      </Flex>
    </Banner>
  )
}

function ProtocolRunErrorBanner({
  runErrors,
  runStatus,
  runHeaderModalContainerUtils,
}: RunHeaderBannerContainerProps): JSX.Element {
  const { t } = useTranslation('run_details')

  const { closeCurrentRun } = useCloseCurrentRun()

  const { highestPriorityError } = runErrors

  const handleFailedRunClick = (): void => {
    closeCurrentRun()
    runHeaderModalContainerUtils.runFailedModalUtils.toggleModal()
  }

  return (
    <Banner
      type={runStatus === RUN_STATUS_SUCCEEDED ? 'warning' : 'error'}
      iconMarginLeft={SPACING.spacing4}
    >
      <Flex
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        width="100%"
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          {highestPriorityError != null
            ? t('error_info', {
                errorType: highestPriorityError?.errorType,
                errorCode: highestPriorityError?.errorCode,
              })
            : `${
                runStatus === RUN_STATUS_SUCCEEDED
                  ? t('run_completed_with_warnings')
                  : t('run_canceled_with_errors')
              }`}
        </StyledText>
        <Link
          onClick={handleFailedRunClick}
          textDecoration={TYPOGRAPHY.textDecorationUnderline}
        >
          {runStatus === RUN_STATUS_SUCCEEDED
            ? t('view_warning_details')
            : t('view_error_details')}
        </Link>
      </Flex>
    </Banner>
  )
}
