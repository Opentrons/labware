import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  ALIGN_STRETCH,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_HIDDEN,
  OVERFLOW_WRAP_ANYWHERE,
  OVERFLOW_WRAP_BREAK_WORD,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SPACING,
  TYPOGRAPHY,
  LargeButton,
  WRAP,
} from '@opentrons/components'
import {
  RUN_STATUS_FAILED,
  RUN_STATUS_STOPPED,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUSES_TERMINAL,
} from '@opentrons/api-client'
import {
  useHost,
  useProtocolQuery,
  useDeleteRunMutation,
  useRunCommandErrors,
  useErrorRecoverySettings,
} from '@opentrons/react-api-client'
import { useRunControls } from '/app/organisms/RunTimeControl/hooks'
import { onDeviceDisplayFormatTimestamp } from '/app/transformations/runs'
import { RunTimer } from '/app/molecules/RunTimer'
import {
  useTrackProtocolRunEvent,
  useTrackEventWithRobotSerial,
  useRobotAnalyticsData,
  useRecoveryAnalytics,
} from '/app/redux-resources/analytics'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_RUN_ACTION,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
  ANALYTICS_QUICK_TRANSFER_RERUN,
} from '/app/redux/analytics'
import { getLocalRobot } from '/app/redux/discovery'
import { RunFailedModal } from '/app/organisms/ODD/RunningProtocol'
import {
  formatTimeWithUtcLabel,
  useIsRunCurrent,
  useNotifyRunQuery,
  useRunTimestamps,
  useRunCreatedAtTimestamp,
  useCloseCurrentRun,
  EMPTY_TIMESTAMP,
  useCurrentRunCommands,
} from '/app/resources/runs'
import { handleTipsAttachedModal } from '/app/organisms/DropTipWizardFlows'
import { useTipAttachmentStatus } from '/app/resources/instruments'
import { lastRunCommandPromptedErrorRecovery } from '/app/local-resources/commands'

import type { IconName } from '@opentrons/components'
import type { OnDeviceRouteParams } from '/app/App/types'
import type { PipetteWithTip } from '/app/resources/instruments'

export function RunSummary(): JSX.Element {
  const { runId } = useParams<
    keyof OnDeviceRouteParams
  >() as OnDeviceRouteParams
  const { t } = useTranslation('run_details')
  const navigate = useNavigate()
  const host = useHost()
  const { data: runRecord } = useNotifyRunQuery(runId, {
    staleTime: Infinity,
    onError: () => {
      // in case the run is remotely deleted by a desktop app, navigate to the dash
      navigate('/dashboard')
    },
  })
  const isRunCurrent = useIsRunCurrent(runId)
  const { deleteRun } = useDeleteRunMutation()
  const runStatus = runRecord?.data.status ?? null
  const didRunSucceed = runStatus === RUN_STATUS_SUCCEEDED
  const protocolId = runRecord?.data.protocolId ?? null
  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name
  const isQuickTransfer = protocolRecord?.data.protocolKind === 'quick-transfer'

  const { startedAt, stoppedAt, completedAt } = useRunTimestamps(runId)
  const createdAtTimestamp = useRunCreatedAtTimestamp(runId)
  const startedAtTimestamp =
    startedAt != null
      ? onDeviceDisplayFormatTimestamp(startedAt)
      : EMPTY_TIMESTAMP

  const completedAtTimestamp =
    completedAt != null
      ? onDeviceDisplayFormatTimestamp(completedAt)
      : EMPTY_TIMESTAMP

  const [showSplash, setShowSplash] = useState(
    runStatus === RUN_STATUS_FAILED || runStatus === RUN_STATUS_SUCCEEDED
  )
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name ?? 'no name'

  const onCloneRunSuccess = (): void => {
    if (isQuickTransfer) {
      deleteRun(runId)
    }
  }

  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(
    runId,
    robotName as string
  )
  const robotAnalyticsData = useRobotAnalyticsData(robotName as string)
  const { reportRecoveredRunResult } = useRecoveryAnalytics()

  const enteredER = runRecord?.data.hasEverEnteredErrorRecovery ?? false
  useEffect(() => {
    if (isRunCurrent && typeof enteredER === 'boolean') {
      reportRecoveredRunResult(runStatus, enteredER)
    }
  }, [isRunCurrent, enteredER])

  const { reset, isResetRunLoading } = useRunControls(runId, onCloneRunSuccess)
  const trackEvent = useTrackEvent()
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()

  const { closeCurrentRun } = useCloseCurrentRun()
  // Close the current run only if it's active and then execute the onSuccess callback. Prefer this wrapper over
  // closeCurrentRun directly, since the callback is swallowed if currentRun is null.
  const closeCurrentRunIfValid = (onSettled?: () => void): void => {
    if (isRunCurrent) {
      closeCurrentRun({
        onSettled: () => {
          onSettled?.()
        },
      })
    } else {
      onSettled?.()
    }
  }
  const [showRunFailedModal, setShowRunFailedModal] = useState<boolean>(false)
  const [showRunAgainSpinner, setShowRunAgainSpinner] = useState<boolean>(false)
  const [showReturnToSpinner, setShowReturnToSpinner] = useState<boolean>(false)

  const robotSerialNumber =
    localRobot?.health?.robot_serial ??
    localRobot?.serverHealth?.serialNumber ??
    null

  const { data: commandErrorList } = useRunCommandErrors(
    runId,
    { cursor: 0, pageLength: 100 },
    {
      enabled:
        runStatus != null &&
        // @ts-expect-error runStatus expected to possibly not be terminal
        RUN_STATUSES_TERMINAL.includes(runStatus) &&
        isRunCurrent,
    }
  )
  // TODO(jh, 08-14-24): The backend never returns the "user cancelled a run" error and cancelledWithoutRecovery becomes unnecessary.
  const cancelledWithoutRecovery =
    !enteredER && runStatus === RUN_STATUS_STOPPED
  const hasCommandErrors =
    commandErrorList != null && commandErrorList.data.length > 0
  const disableErrorDetailsBtn = !(
    (hasCommandErrors && !cancelledWithoutRecovery) ||
    (runRecord?.data.errors != null && runRecord?.data.errors.length > 0)
  )

  let headerText: string | null = null
  if (runStatus === RUN_STATUS_SUCCEEDED) {
    headerText = hasCommandErrors
      ? t('run_completed_with_warnings_splash')
      : t('run_completed_splash')
  } else if (runStatus === RUN_STATUS_FAILED) {
    headerText = t('run_failed_splash')
  } else if (runStatus === RUN_STATUS_STOPPED) {
    headerText =
      enteredER && !disableErrorDetailsBtn
        ? t('run_canceled_with_errors_splash')
        : t('run_canceled_splash')
  }

  const buildHeaderIcon = (): JSX.Element | null => {
    let iconName: IconName | null = null
    let iconColor: string | null = null

    if (runStatus === RUN_STATUS_SUCCEEDED) {
      if (hasCommandErrors) {
        iconName = 'ot-check'
        iconColor = COLORS.yellow50
      } else {
        iconName = 'ot-check'
        iconColor = COLORS.green50
      }
    } else if (runStatus === RUN_STATUS_FAILED) {
      iconName = 'ot-alert'
      iconColor = COLORS.red50
    } else if (runStatus === RUN_STATUS_STOPPED) {
      iconName = 'ot-alert'
      iconColor = COLORS.red50
    }

    return iconName != null && iconColor != null ? (
      <Icon name={iconName} size="2rem" color={iconColor} />
    ) : null
  }

  const {
    determineTipStatus,
    setTipStatusResolved,
    aPipetteWithTip,
  } = useTipAttachmentStatus({
    runId,
    runRecord: runRecord ?? null,
  })
  const { data } = useErrorRecoverySettings()
  const isEREnabled = data?.data.enabled ?? true
  const runSummaryNoFixit = useCurrentRunCommands({
    includeFixitCommands: false,
    pageLength: 1,
  })

  useEffect(() => {
    // Only run tip checking if it wasn't *just* handled during Error Recovery.
    if (!lastRunCommandPromptedErrorRecovery(runSummaryNoFixit, isEREnabled)) {
      void determineTipStatus()
    }
  }, [isRunCurrent, runSummaryNoFixit, isEREnabled])

  const returnToQuickTransfer = (): void => {
    closeCurrentRunIfValid(() => {
      deleteRun(runId)
      navigate('/quick-transfer')
    })
  }

  // TODO(jh, 05-30-24): EXEC-487. Refactor reset() so we can redirect to the setup page, showing the shimmer skeleton instead.
  const runAgain = (): void => {
    setShowRunAgainSpinner(true)
    reset()
    if (isQuickTransfer) {
      trackEventWithRobotSerial({
        name: ANALYTICS_QUICK_TRANSFER_RERUN,
        properties: {
          name: protocolName,
        },
      })
    } else {
      trackEvent({
        name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
        properties: { sourceLocation: 'RunSummary', robotSerialNumber },
      })
      trackProtocolRunEvent({ name: ANALYTICS_PROTOCOL_RUN_ACTION.AGAIN })
    }
  }

  // If no pipettes have tips attached, execute the routing callback.
  const setTipStatusResolvedAndRoute = (
    routeCb: (aPipetteWithTip: PipetteWithTip) => void
  ): (() => Promise<void>) => {
    return () =>
      setTipStatusResolved().then(newPipettesWithTip => {
        routeCb(newPipettesWithTip)
      })
  }

  const handleReturnToDash = (aPipetteWithTip: PipetteWithTip | null): void => {
    setShowReturnToSpinner(true)
    if (isRunCurrent && aPipetteWithTip != null) {
      void handleTipsAttachedModal({
        setTipStatusResolved: setTipStatusResolvedAndRoute(handleReturnToDash),
        host,
        aPipetteWithTip,
        onSettled: () => {
          closeCurrentRunIfValid(() => {
            navigate('/dashboard')
          })
        },
      })
    } else if (isQuickTransfer) {
      returnToQuickTransfer()
    } else {
      closeCurrentRunIfValid(() => {
        navigate('/dashboard')
      })
    }
  }

  const handleRunAgain = (aPipetteWithTip: PipetteWithTip | null): void => {
    if (isRunCurrent && aPipetteWithTip != null) {
      void handleTipsAttachedModal({
        setTipStatusResolved: setTipStatusResolvedAndRoute(handleRunAgain),
        host,
        aPipetteWithTip,
        onSettled: () => {
          runAgain()
        },
      })
    } else {
      if (!isResetRunLoading) {
        runAgain()
      }
    }
  }

  const handleViewErrorDetails = (): void => {
    setShowRunFailedModal(true)
  }

  const handleClickSplash = (): void => {
    trackProtocolRunEvent({
      name: ANALYTICS_PROTOCOL_RUN_ACTION.FINISH,
      properties: robotAnalyticsData ?? undefined,
    })
    setShowSplash(false)
  }

  const buildReturnToCopy = (): string =>
    isQuickTransfer ? t('return_to_quick_transfer') : t('return_to_dashboard')

  const buildReturnToWithSpinnerText = (): JSX.Element => (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="16rem">
      {buildReturnToCopy()}
      <Icon
        name="ot-spinner"
        aria-label="icon_ot-spinner"
        spin={true}
        size="3.5rem"
        color={COLORS.white}
      />
    </Flex>
  )
  const buildRunAgainWithSpinnerText = (): JSX.Element => (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} width="16rem">
      {t('run_again')}
      <Icon
        name="ot-spinner"
        aria-label="icon_ot-spinner"
        spin={true}
        size="2.5rem"
        color={COLORS.white}
      />
    </Flex>
  )

  return (
    <Btn
      display={DISPLAY_FLEX}
      width="100%"
      height="100vh"
      flexDirection={DIRECTION_COLUMN}
      position={POSITION_RELATIVE}
      overflow={OVERFLOW_HIDDEN}
      onClick={handleClickSplash}
    >
      {showSplash ? (
        <Flex
          height="100vh"
          width="100%"
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          position={POSITION_ABSOLUTE}
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing40}
          padding={SPACING.spacing40}
          backgroundColor={didRunSucceed ? COLORS.green50 : COLORS.red50}
        >
          <SplashFrame>
            <Flex gridGap={SPACING.spacing32} alignItems={ALIGN_CENTER}>
              <Icon
                name={didRunSucceed ? 'ot-check' : 'ot-alert'}
                size="4.5rem"
                color={COLORS.white}
              />
              <SplashHeader>
                {didRunSucceed
                  ? t('run_completed_splash')
                  : t('run_failed_splash')}
              </SplashHeader>
            </Flex>
            <Flex width="49rem" justifyContent={JUSTIFY_CENTER}>
              <SplashBody>{protocolName}</SplashBody>
            </Flex>
          </SplashFrame>
        </Flex>
      ) : (
        <Flex
          height="100vh"
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          padding={SPACING.spacing40}
        >
          {showRunFailedModal ? (
            <RunFailedModal
              runId={runId}
              setShowRunFailedModal={setShowRunFailedModal}
              errors={runRecord?.data.errors}
              commandErrorList={commandErrorList}
              runStatus={runStatus}
            />
          ) : null}
          <Flex
            flexDirection={DIRECTION_COLUMN}
            alignItems={ALIGN_FLEX_START}
            gridGap={SPACING.spacing16}
          >
            <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
              {buildHeaderIcon()}
              {headerText != null ? (
                <SummaryHeader>{headerText}</SummaryHeader>
              ) : null}
            </Flex>
            <ProtocolName>{protocolName}</ProtocolName>
            <Flex gridGap={SPACING.spacing8} flexWrap={WRAP}>
              <SummaryDatum>
                {`${t('run')}: ${formatTimeWithUtcLabel(createdAtTimestamp)}`}
              </SummaryDatum>
              <SummaryDatum>
                {`${t('duration')}: `}
                <RunTimer
                  {...{
                    runStatus,
                    startedAt,
                    stoppedAt,
                    completedAt,
                  }}
                  style={DURATION_TEXT_STYLE}
                />
              </SummaryDatum>
              <SummaryDatum>
                {`${t('start')}: ${formatTimeWithUtcLabel(startedAtTimestamp)}`}
              </SummaryDatum>
              <SummaryDatum>
                {`${t('end')}: ${formatTimeWithUtcLabel(completedAtTimestamp)}`}
              </SummaryDatum>
            </Flex>
          </Flex>
          <ButtonContainer>
            <EqualWidthButton
              iconName="arrow-left"
              buttonType="secondary"
              onClick={() => {
                handleReturnToDash(aPipetteWithTip)
              }}
              buttonText={
                showReturnToSpinner
                  ? buildReturnToWithSpinnerText()
                  : buildReturnToCopy()
              }
              css={showReturnToSpinner ? RETURN_TO_CLICKED_STYLE : undefined}
            />
            <EqualWidthButton
              iconName="play-round-corners"
              onClick={() => {
                handleRunAgain(aPipetteWithTip)
              }}
              buttonText={
                showRunAgainSpinner
                  ? buildRunAgainWithSpinnerText()
                  : t('run_again')
              }
              css={showRunAgainSpinner ? RUN_AGAIN_CLICKED_STYLE : undefined}
            />
            <EqualWidthButton
              iconName="info"
              buttonType="alert"
              onClick={handleViewErrorDetails}
              buttonText={
                hasCommandErrors && runStatus === RUN_STATUS_SUCCEEDED
                  ? t('view_warning_details')
                  : t('view_error_details')
              }
              disabled={disableErrorDetailsBtn}
            />
          </ButtonContainer>
        </Flex>
      )}
    </Btn>
  )
}

const SplashHeader = styled.h1`
  font-weight: ${TYPOGRAPHY.fontWeightBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: 80px;
  line-height: 94px;
  color: ${COLORS.white};
`
const SplashBody = styled.h4`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_BREAK_WORD};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  text-align: ${TYPOGRAPHY.textAlignCenter};
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  font-size: ${TYPOGRAPHY.fontSize32};
  line-height: ${TYPOGRAPHY.lineHeight42};
  color: ${COLORS.white};
`

const SummaryHeader = styled.h4`
  font-weight: ${TYPOGRAPHY.fontWeightBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize28};
  line-height: ${TYPOGRAPHY.lineHeight36};
`

const SplashFrame = styled(Flex)`
  width: 100%;
  height: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing40};
  border-radius: ${BORDERS.borderRadius8};
`

const ProtocolName = styled.h4`
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize28};
  line-height: ${TYPOGRAPHY.lineHeight36};
  color: ${COLORS.grey60};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_ANYWHERE};
  height: max-content;
`

const SummaryDatum = styled.div`
  display: ${DISPLAY_FLEX};
  flex-direction: ${DIRECTION_ROW};
  align-items: ${ALIGN_CENTER};
  padding: ${SPACING.spacing8} ${SPACING.spacing12};
  grid-gap: ${SPACING.spacing4};
  height: 44px;
  background: #d6d6d6;
  border-radius: ${BORDERS.borderRadius4};
  color: ${COLORS.grey60};
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  width: max-content;
`
const DURATION_TEXT_STYLE = css`
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
`

const RETURN_TO_CLICKED_STYLE = css`
  background-color: ${COLORS.blue40};
  &:focus {
    background-color: ${COLORS.blue40};
  }
  &:hover {
    background-color: ${COLORS.blue40};
  }
  &:focus-visible {
    background-color: ${COLORS.blue40};
  }
  &:active {
    background-color: ${COLORS.blue40};
  }
`

const RUN_AGAIN_CLICKED_STYLE = css`
  background-color: ${COLORS.blue60};
  &:focus {
    background-color: ${COLORS.blue60};
  }
  &:hover {
    background-color: ${COLORS.blue60};
  }
  &:focus-visible {
    background-color: ${COLORS.blue60};
  }
  &:active {
    background-color: ${COLORS.blue60};
  }
`

const ButtonContainer = styled(Flex)`
  align-self: ${ALIGN_STRETCH};
  gap: ${SPACING.spacing16};
`

const EqualWidthButton = styled(LargeButton)`
  flex: 1;
  min-width: 0;
  height: 17rem;
`
