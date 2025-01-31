import { useMemo, useState, forwardRef, useRef } from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { ViewportList } from 'react-viewport-list'

import { RUN_STATUSES_TERMINAL } from '@opentrons/api-client'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  DISPLAY_NONE,
  Flex,
  InfoScreen,
  LegacyStyledText,
  OVERFLOW_SCROLL,
  POSITION_FIXED,
  PrimaryButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import {
  useNotifyAllCommandsAsPreSerializedList,
  useNotifyRunQuery,
  useRunStatus,
  useMostRecentCompletedAnalysis,
  useLastRunCommand,
} from '/app/resources/runs'
import { CommandText, CommandIcon } from '/app/molecules/Command'
import { Divider } from '/app/atoms/structure'
import { NAV_BAR_WIDTH } from '/app/App/constants'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'

import type { ForwardedRef } from 'react'
import type { ViewportListRef } from 'react-viewport-list'
import type { RunStatus } from '@opentrons/api-client'
import type { RobotType } from '@opentrons/shared-data'

const COLOR_FADE_MS = 500
const LIVE_RUN_COMMANDS_POLL_MS = 3000
// arbitrary large number of commands
const MAX_COMMANDS = 100000

interface RunPreviewProps {
  runId: string
  robotType: RobotType
  jumpedIndex: number | null
  makeHandleScrollToStep: (index: number) => () => void
}
export const RunPreviewComponent = (
  { runId, jumpedIndex, makeHandleScrollToStep, robotType }: RunPreviewProps,
  ref: ForwardedRef<ViewportListRef>
): JSX.Element | null => {
  const { t } = useTranslation(['run_details', 'protocol_setup'])
  const robotSideAnalysis = useMostRecentCompletedAnalysis(runId)
  const runStatus = useRunStatus(runId)
  const { data: runRecord } = useNotifyRunQuery(runId)
  const isRunTerminal =
    runStatus != null
      ? (RUN_STATUSES_TERMINAL as RunStatus[]).includes(runStatus)
      : false
  // we only ever want one request done for terminal runs because this is a heavy request
  const {
    data: commandsFromQueryResponse,
    isLoading: isRunCommandDataLoading,
  } = useNotifyAllCommandsAsPreSerializedList(
    runId,
    { cursor: 0, pageLength: MAX_COMMANDS, includeFixitCommands: false },
    {
      enabled: isRunTerminal,
    }
  )
  const commandsFromQuery = commandsFromQueryResponse?.data
  const viewPortRef = useRef<HTMLDivElement | null>(null)
  const currentRunCommandKey = useLastRunCommand(runId, {
    refetchInterval: LIVE_RUN_COMMANDS_POLL_MS,
  })?.key
  const [
    isCurrentCommandVisible,
    setIsCurrentCommandVisible,
  ] = useState<boolean>(true)

  const isValidRobotSideAnalysis = robotSideAnalysis != null
  const allRunDefs = useMemo(
    () =>
      robotSideAnalysis != null
        ? getLabwareDefinitionsFromCommands(robotSideAnalysis.commands)
        : [],
    [isValidRobotSideAnalysis]
  )

  if (robotSideAnalysis == null) {
    return null
  }
  const commands = isRunTerminal
    ? commandsFromQuery
    : robotSideAnalysis.commands

  // pass relevant data from run rather than analysis so that CommandText utilities can properly hash the entities' IDs
  // TODO (nd:05/02/2024, AUTH-380): update name and types for CommandText (and children/utilities) use of analysis.
  // We should ideally pass only subset of analysis/run data required by these children and utilities
  const protocolDataFromAnalysisOrRun =
    isRunTerminal && runRecord?.data != null
      ? {
          ...robotSideAnalysis,
          labware: runRecord.data.labware ?? [],
          modules: runRecord.data.modules ?? [],
          pipettes: runRecord.data.pipettes ?? [],
          liquids: runRecord.data.liquids ?? [],
          commands: commands ?? [],
        }
      : robotSideAnalysis
  const currentRunCommandIndex =
    commands != null
      ? commands.findIndex(c => c.key === currentRunCommandKey)
      : 0
  if (isRunCommandDataLoading || commands == null) {
    return (
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
        <LegacyStyledText alignSelf={ALIGN_CENTER} color={COLORS.grey50}>
          {t('protocol_setup:loading_data')}
        </LegacyStyledText>
      </Flex>
    )
  }
  return commands.length === 0 ? (
    <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
      <InfoScreen content={t('protocol_setup:run_never_started')} />
    </Flex>
  ) : (
    <Flex
      ref={viewPortRef}
      flexDirection={DIRECTION_COLUMN}
      height="65vh"
      width="100%"
      overflowY={OVERFLOW_SCROLL}
      gridGap={SPACING.spacing8}
      padding={SPACING.spacing16}
    >
      <>
        <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
          <LegacyStyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {t('run_preview')}
          </LegacyStyledText>
          <LegacyStyledText as="label" color={COLORS.grey50}>
            {t('steps_total', { count: commands.length })}
          </LegacyStyledText>
        </Flex>
        <LegacyStyledText as="p" marginBottom={SPACING.spacing8}>
          {t('preview_of_protocol_steps')}
        </LegacyStyledText>
        <Divider marginX={`calc(-1 * ${SPACING.spacing16})`} />
        <ViewportList
          viewportRef={viewPortRef}
          ref={ref}
          items={commands}
          onViewportIndexesChange={([
            lowestVisibleIndex,
            highestVisibleIndex,
          ]) => {
            if (currentRunCommandIndex >= 0) {
              setIsCurrentCommandVisible(
                currentRunCommandIndex >= lowestVisibleIndex &&
                  currentRunCommandIndex <= highestVisibleIndex
              )
            }
          }}
          initialIndex={currentRunCommandIndex}
        >
          {(command, index) => {
            const isCurrent = index === currentRunCommandIndex
            const backgroundColor = isCurrent ? COLORS.blue30 : COLORS.grey20
            const iconColor = isCurrent ? COLORS.blue60 : COLORS.grey50
            return (
              <Flex
                key={command.id}
                alignItems={ALIGN_CENTER}
                gridGap={SPACING.spacing8}
              >
                <LegacyStyledText
                  minWidth={SPACING.spacing16}
                  fontSize={TYPOGRAPHY.fontSizeCaption}
                >
                  {index + 1}
                </LegacyStyledText>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing4}
                  width="100%"
                  backgroundColor={
                    index === jumpedIndex ? '#F5E3FF' : backgroundColor
                  }
                  color={COLORS.black90}
                  borderRadius={BORDERS.borderRadius4}
                  padding={SPACING.spacing8}
                  css={css`
                    transition: background-color ${COLOR_FADE_MS}ms ease-out,
                      border-color ${COLOR_FADE_MS}ms ease-out;
                  `}
                >
                  <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                    <CommandIcon command={command} color={iconColor} />
                    <CommandText
                      command={command}
                      commandTextData={protocolDataFromAnalysisOrRun}
                      robotType={robotType}
                      color={COLORS.black90}
                      allRunDefs={allRunDefs}
                    />
                  </Flex>
                </Flex>
              </Flex>
            )
          }}
        </ViewportList>
        {currentRunCommandIndex >= 0 ? (
          <PrimaryButton
            position={POSITION_FIXED}
            bottom={SPACING.spacing40}
            left={`calc(calc(100% + ${NAV_BAR_WIDTH})/2)`} // add width of half of nav bar to center within run tab
            transform="translate(-50%)"
            borderRadius={SPACING.spacing32}
            display={isCurrentCommandVisible ? DISPLAY_NONE : DISPLAY_FLEX}
            onClick={makeHandleScrollToStep(currentRunCommandIndex)}
            id="RunLog_jumpToCurrentStep"
          >
            {t('view_current_step')}
          </PrimaryButton>
        ) : null}
        {currentRunCommandIndex === commands.length - 1 ? (
          <LegacyStyledText as="h6" color={COLORS.grey60}>
            {t('end_of_protocol')}
          </LegacyStyledText>
        ) : null}
      </>
    </Flex>
  )
}

export const RunPreview = forwardRef(RunPreviewComponent)
