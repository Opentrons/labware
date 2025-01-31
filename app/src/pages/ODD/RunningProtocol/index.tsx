import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  OVERFLOW_HIDDEN,
  POSITION_RELATIVE,
  POSITION_ABSOLUTE,
  ALIGN_FLEX_END,
  SPACING,
  useSwipe,
} from '@opentrons/components'
import {
  useProtocolQuery,
  useRunActionMutations,
} from '@opentrons/react-api-client'
import {
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
} from '@opentrons/api-client'

import { StepMeter } from '/app/atoms/StepMeter'

import {
  useRunStatus,
  useRunTimestamps,
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
  useLastRunCommand,
} from '/app/resources/runs'
import {
  InterventionModal,
  useInterventionModal,
} from '/app/organisms/InterventionModal'
import {
  CurrentRunningProtocolCommand,
  RunningProtocolCommandList,
  RunningProtocolSkeleton,
} from '/app/organisms/ODD/RunningProtocol'
import { useRobotType } from '/app/redux-resources/robots'
import {
  useTrackProtocolRunEvent,
  useRobotAnalyticsData,
} from '/app/redux-resources/analytics'
import { CancelingRunModal } from '/app/organisms/ODD/RunningProtocol/CancelingRunModal'
import { ConfirmCancelRunModal } from '/app/organisms/ODD/RunningProtocol/ConfirmCancelRunModal'
import { getLocalRobot } from '/app/redux/discovery'
import { OpenDoorAlertModal } from '/app/organisms/ODD/OpenDoorAlertModal'
import {
  useErrorRecoveryFlows,
  ErrorRecoveryFlows,
} from '/app/organisms/ErrorRecoveryFlows'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'

import type { OnDeviceRouteParams } from '/app/App/types'

const RUN_STATUS_REFETCH_INTERVAL = 5000
const LIVE_RUN_COMMANDS_POLL_MS = 3000
interface BulletProps {
  isActive: boolean
}
const Bullet = styled.div`
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 50%;
  z-index: 2;
  background: ${(props: BulletProps) =>
    props.isActive ? COLORS.grey50 : COLORS.grey40};
  transform: ${(props: BulletProps) =>
    props.isActive ? 'scale(2)' : 'scale(1)'};
`

export type ScreenOption =
  | 'CurrentRunningProtocolCommand'
  | 'RunningProtocolCommandList'

export function RunningProtocol(): JSX.Element {
  const { runId } = useParams<
    keyof OnDeviceRouteParams
  >() as OnDeviceRouteParams
  const [currentOption, setCurrentOption] = useState<ScreenOption>(
    'CurrentRunningProtocolCommand'
  )
  const [
    showConfirmCancelRunModal,
    setShowConfirmCancelRunModal,
  ] = useState<boolean>(false)
  const lastAnimatedCommand = useRef<string | null>(null)
  const { ref, style, swipeType, setSwipeType } = useSwipe()
  const robotSideAnalysis = useMostRecentCompletedAnalysis(runId)
  const lastRunCommand = useLastRunCommand(runId, {
    refetchInterval: LIVE_RUN_COMMANDS_POLL_MS,
  })

  const totalIndex = robotSideAnalysis?.commands.length
  const currentRunCommandIndex = robotSideAnalysis?.commands.findIndex(
    c => c.key === lastRunCommand?.key
  )
  const runStatus = useRunStatus(runId, {
    refetchInterval: RUN_STATUS_REFETCH_INTERVAL,
  })
  const { startedAt, stoppedAt, completedAt } = useRunTimestamps(runId)
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const protocolId = runRecord?.data.protocolId ?? null
  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name
  const isQuickTransfer = protocolRecord?.data.protocolKind === 'quick-transfer'
  const { playRun, pauseRun } = useRunActionMutations(runId)
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot != null ? localRobot.name : 'no name'
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)
  const robotType = useRobotType(robotName)
  const { isERActive, failedCommand, runLwDefsByUri } = useErrorRecoveryFlows(
    runId,
    runStatus
  )
  const {
    showModal: showIntervention,
    modalProps: interventionProps,
  } = useInterventionModal({
    runStatus,
    lastRunCommand,
    runData: runRecord?.data ?? null,
    robotName,
    analysis: robotSideAnalysis,
    doorIsOpen: runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  })

  useEffect(() => {
    if (
      currentOption === 'CurrentRunningProtocolCommand' &&
      swipeType === 'swipe-left'
    ) {
      setCurrentOption('RunningProtocolCommandList')
      setSwipeType('')
    }

    if (
      currentOption === 'RunningProtocolCommandList' &&
      swipeType === 'swipe-right'
    ) {
      setCurrentOption('CurrentRunningProtocolCommand')
      setSwipeType('')
    }
  }, [currentOption, swipeType, setSwipeType])

  const isValidRobotSideAnalysis = robotSideAnalysis != null
  const allRunDefs = useMemo(
    () =>
      robotSideAnalysis != null
        ? getLabwareDefinitionsFromCommands(robotSideAnalysis.commands)
        : [],
    [isValidRobotSideAnalysis]
  )

  return (
    <>
      {isERActive ? (
        <ErrorRecoveryFlows
          runStatus={runStatus}
          runId={runId}
          unvalidatedFailedCommand={failedCommand}
          runLwDefsByUri={runLwDefsByUri}
          protocolAnalysis={robotSideAnalysis}
        />
      ) : null}
      {runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR && !showIntervention ? (
        <OpenDoorAlertModal />
      ) : null}
      {runStatus === RUN_STATUS_STOP_REQUESTED ? <CancelingRunModal /> : null}
      {/* note: this zindex is here to establish a zindex context for the bullets
          so they're relatively-above this flex but not anything else like error
          recovery
        */}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        position={POSITION_RELATIVE}
        overflow={OVERFLOW_HIDDEN}
        zIndex="0"
      >
        {robotSideAnalysis != null ? (
          <StepMeter
            totalSteps={totalIndex ?? 0}
            currentStep={
              currentRunCommandIndex != null
                ? Number(currentRunCommandIndex) + 1
                : 1
            }
          />
        ) : null}
        {showConfirmCancelRunModal ? (
          <ConfirmCancelRunModal
            runId={runId}
            isQuickTransfer={isQuickTransfer}
            setShowConfirmCancelRunModal={setShowConfirmCancelRunModal}
            isActiveRun={true}
          />
        ) : null}
        {showIntervention ? (
          <InterventionModal {...interventionProps} onResume={playRun} />
        ) : null}
        <Flex
          ref={ref}
          style={style}
          padding={`1.75rem ${SPACING.spacing40} ${SPACING.spacing40}`}
          flexDirection={DIRECTION_COLUMN}
        >
          {robotSideAnalysis != null ? (
            currentOption === 'CurrentRunningProtocolCommand' ? (
              <CurrentRunningProtocolCommand
                runId={runId}
                playRun={playRun}
                pauseRun={pauseRun}
                setShowConfirmCancelRunModal={setShowConfirmCancelRunModal}
                trackProtocolRunEvent={trackProtocolRunEvent}
                robotType={robotType}
                robotAnalyticsData={robotAnalyticsData}
                protocolName={protocolName}
                runStatus={runStatus}
                currentRunCommandIndex={currentRunCommandIndex}
                robotSideAnalysis={robotSideAnalysis}
                runTimerInfo={{
                  runStatus,
                  startedAt,
                  stoppedAt,
                  completedAt,
                }}
                lastRunCommand={lastRunCommand}
                lastAnimatedCommand={lastAnimatedCommand.current}
                updateLastAnimatedCommand={(newCommandKey: string) =>
                  (lastAnimatedCommand.current = newCommandKey)
                }
                allRunDefs={allRunDefs}
              />
            ) : (
              <>
                <RunningProtocolCommandList
                  protocolName={protocolName}
                  runStatus={runStatus}
                  robotType={robotType}
                  playRun={playRun}
                  pauseRun={pauseRun}
                  setShowConfirmCancelRunModal={setShowConfirmCancelRunModal}
                  trackProtocolRunEvent={trackProtocolRunEvent}
                  robotAnalyticsData={robotAnalyticsData}
                  currentRunCommandIndex={currentRunCommandIndex}
                  robotSideAnalysis={robotSideAnalysis}
                  allRunDefs={allRunDefs}
                />
                <Flex
                  css={css`
                    background: linear-gradient(
                      rgba(255, 0, 0, 0) 85%,
                      #ffffff
                    );
                  `}
                  position={POSITION_ABSOLUTE}
                  height="20.25rem"
                  width="59rem"
                  marginTop="9.25rem"
                  alignSelf={ALIGN_FLEX_END}
                />
              </>
            )
          ) : (
            <RunningProtocolSkeleton currentOption={currentOption} />
          )}
          <Flex
            marginTop={SPACING.spacing32}
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing16}
            justifyContent={JUSTIFY_CENTER}
            alignItems={ALIGN_CENTER}
          >
            <Bullet
              isActive={currentOption === 'CurrentRunningProtocolCommand'}
            />
            <Bullet isActive={currentOption === 'RunningProtocolCommandList'} />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
