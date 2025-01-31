import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  Link,
  SIZE_1,
  SPACING,
  TOOLTIP_LEFT,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import { useCommandQuery } from '@opentrons/react-api-client'
import {
  RUN_STATUS_IDLE,
  RUN_STATUS_FINISHING,
  RUN_STATUS_RUNNING,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
} from '@opentrons/api-client'

import { getModalPortalEl } from '/app/App/portal'
import { useRunControls } from '/app/organisms/RunTimeControl'
import {
  InterventionModal,
  useInterventionModal,
} from '/app/organisms/InterventionModal'
import { ProgressBar } from '/app/atoms/ProgressBar'
import { useDownloadRunLog } from '../Devices/hooks'
import { InterventionTicks } from './InterventionTicks'
import {
  useNotifyRunQuery,
  useNotifyAllCommandsQuery,
  useRunStatus,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { useRobotType } from '/app/redux-resources/robots'
import { useRunningStepCounts } from '/app/resources/protocols/hooks'
import { useRunProgressCopy } from './hooks'

import type { MouseEventHandler } from 'react'

interface RunProgressMeterProps {
  runId: string
  robotName: string
  makeHandleJumpToStep: (index: number) => () => void
}
export function RunProgressMeter(props: RunProgressMeterProps): JSX.Element {
  const { runId, robotName, makeHandleJumpToStep } = props
  const { t } = useTranslation('run_details')
  const robotType = useRobotType(robotName)
  const runStatus = useRunStatus(runId)
  const { play } = useRunControls(runId)
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_LEFT,
  })
  const { data: runRecord } = useNotifyRunQuery(runId)
  const runData = runRecord?.data ?? null

  const { data: mostRecentCommandData } = useNotifyAllCommandsQuery(runId, {
    pageLength: 1,
  })
  // This lastRunCommand also includes "fixit" commands.
  const lastRunCommand = mostRecentCommandData?.data[0] ?? null
  const { data: runCommandDetails } = useCommandQuery(
    runId,
    lastRunCommand?.id ?? null
  )

  const analysis = useMostRecentCompletedAnalysis(runId)
  const analysisCommands = analysis?.commands ?? []

  const {
    currentStepNumber,
    totalStepCount,
    hasRunDiverged,
  } = useRunningStepCounts(runId, mostRecentCommandData)

  const downloadIsDisabled =
    runStatus === RUN_STATUS_RUNNING ||
    runStatus === RUN_STATUS_IDLE ||
    runStatus === RUN_STATUS_FINISHING

  const { downloadRunLog } = useDownloadRunLog(robotName, runId)

  const onDownloadClick: MouseEventHandler<HTMLAnchorElement> = e => {
    if (downloadIsDisabled) return false
    e.preventDefault()
    e.stopPropagation()
    downloadRunLog()
  }
  const {
    showModal: showIntervention,
    modalProps: interventionProps,
  } = useInterventionModal({
    robotName,
    runStatus,
    runData,
    analysis,
    lastRunCommand,
    doorIsOpen: runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  })

  const {
    progressPercentage,
    stepCountStr,
    currentStepContents,
  } = useRunProgressCopy({
    runStatus,
    robotType,
    currentStepNumber,
    totalStepCount,
    analysis,
    analysisCommands,
    runCommandDetails: runCommandDetails ?? null,
    hasRunDiverged,
  })

  return (
    <>
      {showIntervention
        ? createPortal(
            <InterventionModal {...interventionProps} onResume={play} />,
            getModalPortalEl()
          )
        : null}
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <Flex gridGap={SPACING.spacing8}>
            <LegacyStyledText
              as="h2"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            >
              {stepCountStr}
            </LegacyStyledText>

            {currentStepContents}
          </Flex>
          <Link
            {...targetProps}
            role="button"
            css={css`
              ${TYPOGRAPHY.darkLinkH4SemiBold}
              &:hover {
                color: ${downloadIsDisabled ? COLORS.grey40 : COLORS.black90};
              }
              cursor: ${downloadIsDisabled ? CURSOR_DEFAULT : CURSOR_POINTER};
            `}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            onClick={onDownloadClick}
          >
            <Flex
              gridGap={SPACING.spacing2}
              alignItems={ALIGN_CENTER}
              color={COLORS.grey60}
            >
              <Icon name="download" size={SIZE_1} />
              {t('download_run_log')}
            </Flex>
          </Link>
          {downloadIsDisabled ? (
            <Tooltip tooltipProps={tooltipProps}>
              {t('complete_protocol_to_download')}
            </Tooltip>
          ) : null}
        </Flex>
        {!hasRunDiverged ? (
          <ProgressBar
            percentComplete={progressPercentage}
            outerStyles={css`
              height: 0.375rem;
              background-color: ${COLORS.grey30};
              border-radius: ${BORDERS.borderRadius4};
              position: relative;
              overflow: initial;
            `}
            innerStyles={css`
              height: 0.375rem;
              background-color: ${COLORS.grey60};
              border-radius: ${BORDERS.borderRadius4};
            `}
          >
            <InterventionTicks
              {...{ makeHandleJumpToStep, analysisCommands }}
            />
          </ProgressBar>
        ) : null}
      </Flex>
    </>
  )
}
