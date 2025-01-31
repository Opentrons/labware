import { css, keyframes } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_WRAP_ANYWHERE,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { RUN_STATUS_RUNNING, RUN_STATUS_IDLE } from '@opentrons/api-client'

import { CommandText } from '/app/molecules/Command'
import { RunTimer } from '/app/molecules/RunTimer'
import { getCommandTextData } from '/app/local-resources/commands'
import { PlayPauseButton } from './PlayPauseButton'
import { StopButton } from './StopButton'
import { ANALYTICS_PROTOCOL_RUN_ACTION } from '/app/redux/analytics'
import { useRunningStepCounts } from '/app/resources/protocols/hooks'
import { useNotifyAllCommandsQuery } from '/app/resources/runs'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { RunCommandSummary, RunStatus } from '@opentrons/api-client'
import type { TrackProtocolRunEvent } from '/app/redux-resources/analytics'
import type { RobotAnalyticsData } from '/app/redux/analytics/types'

const ODD_ANIMATION_OPTIMIZATIONS = `
  backface-visibility: hidden;
  perspective: 1000;
  will-change: opacity, transform;
  `

const fadeIn = keyframes`
from {
  opacity: 0;
  transform: translate3d(0,15%,0);
}
to {
  opacity: 1;
  transform: translate3d(0,0,0);
}
`

const TITLE_TEXT_STYLE = css`
  color: ${COLORS.grey60};
  font-size: 1.75rem;
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  line-height: 2.25rem;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_ANYWHERE};
  height: max-content;
`

const RUN_TIMER_STYLE = css`
  font-size: 2rem;
  font-weight: ${TYPOGRAPHY.fontWeightBold};
  line-height: 2.625rem;
  color: ${COLORS.black90};
`

const COMMAND_ROW_STYLE_BASE = css`
  font-size: 1.375rem;
  line-height: 1.75rem;
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  text-align: center;
  width: 100%;
  max-width: 100%;
  margin: auto;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-height: 4.6rem; // This ensures we don't show any extra text after truncating.
  word-break: break-word;
  white-space: normal;
`

const COMMAND_ROW_STYLE_ANIMATED = css`
  ${COMMAND_ROW_STYLE_BASE}
  animation: ${fadeIn} 1.5s ease-in-out;
  ${ODD_ANIMATION_OPTIMIZATIONS}
`

const COMMAND_ROW_STYLE = css`
  ${COMMAND_ROW_STYLE_BASE}
`

interface RunTimerInfo {
  runStatus: string | null
  startedAt: string | null
  stoppedAt: string | null
  completedAt: string | null
}

interface CurrentRunningProtocolCommandProps {
  runId: string
  runStatus: RunStatus | null
  robotSideAnalysis: CompletedProtocolAnalysis | null
  robotType: RobotType
  runTimerInfo: RunTimerInfo
  playRun: () => void
  pauseRun: () => void
  setShowConfirmCancelRunModal: (showConfirmCancelRunModal: boolean) => void
  trackProtocolRunEvent: TrackProtocolRunEvent
  robotAnalyticsData: RobotAnalyticsData | null
  lastAnimatedCommand: string | null
  lastRunCommand: RunCommandSummary | null
  updateLastAnimatedCommand: (newCommandKey: string) => void
  allRunDefs: LabwareDefinition2[]
  protocolName?: string
  currentRunCommandIndex?: number
}

export function CurrentRunningProtocolCommand({
  runId,
  runStatus,
  robotSideAnalysis,
  runTimerInfo,
  playRun,
  pauseRun,
  setShowConfirmCancelRunModal,
  trackProtocolRunEvent,
  robotAnalyticsData,
  robotType,
  protocolName,
  currentRunCommandIndex,
  lastRunCommand,
  lastAnimatedCommand,
  updateLastAnimatedCommand,
  allRunDefs,
}: CurrentRunningProtocolCommandProps): JSX.Element | null {
  const { t } = useTranslation('run_details')
  const { data: mostRecentCommandData } = useNotifyAllCommandsQuery(runId, {
    pageLength: 1,
  })

  const currentCommand =
    robotSideAnalysis?.commands.find(
      (c: RunTimeCommand, index: number) => index === currentRunCommandIndex
    ) ?? lastRunCommand

  let shouldAnimate = true
  if (currentCommand?.key != null) {
    if (lastAnimatedCommand == null) {
      updateLastAnimatedCommand(currentCommand.key)
      shouldAnimate = true
    } else if (lastAnimatedCommand === currentCommand.key) {
      shouldAnimate = false
    } else {
      shouldAnimate = true
      updateLastAnimatedCommand(currentCommand.key)
    }
  }
  const currentRunStatus = t(`status_${runStatus}`)

  const {
    currentStepNumber,
    totalStepCount,
    hasRunDiverged,
  } = useRunningStepCounts(runId, mostRecentCommandData)
  const stepCounterCopy = hasRunDiverged
    ? `${t('step_na')}`
    : `${t('step')} ${currentStepNumber ?? '?'}/${totalStepCount ?? '?'}`

  const onStop = (): void => {
    if (runStatus === RUN_STATUS_RUNNING) pauseRun()
    setShowConfirmCancelRunModal(true)
  }

  const onTogglePlayPause = (): void => {
    if (runStatus === RUN_STATUS_RUNNING) {
      pauseRun()
      trackProtocolRunEvent({ name: ANALYTICS_PROTOCOL_RUN_ACTION.PAUSE })
    } else {
      playRun()
      trackProtocolRunEvent({
        name:
          runStatus === RUN_STATUS_IDLE
            ? ANALYTICS_PROTOCOL_RUN_ACTION.START
            : ANALYTICS_PROTOCOL_RUN_ACTION.RESUME,
        properties:
          runStatus === RUN_STATUS_IDLE && robotAnalyticsData != null
            ? robotAnalyticsData
            : {},
      })
    }
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      height="29.5rem"
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_FLEX_START}
        gridGap={SPACING.spacing40}
        height="6.75rem"
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <LegacyStyledText
            fontSize={TYPOGRAPHY.fontSize28}
            lineHeight={TYPOGRAPHY.lineHeight36}
            fontWeight={TYPOGRAPHY.fontWeightBold}
          >
            {currentRunStatus}
          </LegacyStyledText>
          <LegacyStyledText css={TITLE_TEXT_STYLE}>
            {protocolName}
          </LegacyStyledText>
        </Flex>
        <Flex
          height="100%"
          alignItems={ALIGN_FLEX_END}
          flexDirection={DIRECTION_COLUMN}
        >
          <RunTimer {...runTimerInfo} style={RUN_TIMER_STYLE} />
          <LegacyStyledText as="h4SemiBold">{stepCounterCopy}</LegacyStyledText>
        </Flex>
      </Flex>

      <Flex
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing24}
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        <StopButton onStop={onStop} />
        <PlayPauseButton
          onTogglePlayPause={onTogglePlayPause}
          runStatus={runStatus}
        />
      </Flex>
      <Flex
        padding={`${SPACING.spacing12} ${SPACING.spacing24}`}
        backgroundColor={COLORS.blue35}
        borderRadius={BORDERS.borderRadius8}
        justifyContent={JUSTIFY_CENTER}
        css={shouldAnimate ? COMMAND_ROW_STYLE_ANIMATED : COMMAND_ROW_STYLE}
      >
        {robotSideAnalysis != null && currentCommand != null ? (
          <CommandText
            command={currentCommand}
            commandTextData={getCommandTextData(robotSideAnalysis)}
            robotType={robotType}
            isOnDevice={true}
            allRunDefs={allRunDefs}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
