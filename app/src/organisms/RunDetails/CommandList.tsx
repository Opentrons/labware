import dropWhile from 'lodash/dropWhile'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  DIRECTION_COLUMN,
  TEXT_TRANSFORM_UPPERCASE,
  FONT_SIZE_CAPTION,
  SPACING_1,
  SPACING_2,
  SPACING_3,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Btn,
  SIZE_1,
  C_MED_DARK_GRAY,
  FONT_HEADER_DARK,
  JUSTIFY_START,
  Text,
  C_NEAR_WHITE,
  TEXT_TRANSFORM_CAPITALIZE,
  AlertItem,
  Box,
  ALIGN_STRETCH,
  ALIGN_CENTER,
} from '@opentrons/components'
import {
  RUN_STATUS_FAILED,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_STOPPED,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_RUNNING,
} from '@opentrons/api-client'
import { useAllCommandsQuery } from '@opentrons/react-api-client'
import { useRunStatus, useRunStartTime } from '../RunTimeControl/hooks'
import { useProtocolDetails } from './hooks'
import { useCurrentRunCommands, useCurrentRunId } from '../ProtocolUpload/hooks'
import { ProtocolSetupInfo } from './ProtocolSetupInfo'
import { CommandItem } from './CommandItem'
import type { RunStatus, RunCommandSummary } from '@oppentrons/api-client'
import type {
  ProtocolFile,
  RunTimeCommand,
  CommandStatus,
} from '@opentrons/shared-data'

const WINDOW_SIZE = 60 // number of command items rendered at a time
const WINDOW_OVERLAP = 30 // number of command items that fall within two adjacent windows
const EAGER_BUFFER_COEFFICIENT = 0.1 // multiplied by clientHeight to determine number of pixels away from the next window required for it to load
const COMMANDS_REFETCH_INTERVAL = 3000
interface CommandRuntimeInfo {
  analysisCommand: RunTimeCommand | null // analysisCommand will only be null if protocol is nondeterministic
  runCommandSummary: RunCommandSummary | null
}

// use state for the cursor whcih defaults to null
// grab the current command id from the all command response
// remove command detials fetching , don't remvoe  but make it way les
export function CommandList(): JSX.Element | null {
  const { t } = useTranslation('run_details')
  const protocolData: ProtocolFile<{}> | null = useProtocolDetails()
    .protocolData
  const runStartTime = useRunStartTime()
  const runStatus = useRunStatus()
  const [currentCommandId, setCurrentCommandId] = React.useState<string | null>(
    null
  )
  const listInnerRef = React.useRef<HTMLDivElement>(null)
  const currentItemRef = React.useRef<HTMLDivElement>(null)
  const [commandCursorIndex, setCommandCursorIndex] = React.useState<
    number | null
  >(0)
  const currentRunId = useCurrentRunId()
  const { data: commandsData, isFetching: isFetchingCommands } = useAllCommandsQuery(
    currentRunId,
    {
      cursor: commandCursorIndex,
      before: 0,
      after: WINDOW_SIZE,
    },
    {
      refetchInterval: COMMANDS_REFETCH_INTERVAL,
      onSuccess: data => {
        if (commandCursorIndex === null) {
          setCommandCursorIndex(data.meta.cursor ?? null)
        }
      },
    }
  )
  const totalRunCommandCount = commandsData?.meta.totalCount ?? 0
  const runCommands = commandsData?.data ?? []

  const [windowIndex, setWindowIndex] = React.useState<number>(0)
  const [
    isInitiallyJumpingToCurrent,
    setIsInitiallyJumpingToCurrent,
  ] = React.useState<boolean>(false)

  const analysisCommandsWithStatus =
    protocolData?.commands != null
      ? protocolData.commands.map(command => ({
          ...command,
          status: 'queued' as CommandStatus,
        }))
      : []
  const allProtocolCommands: RunTimeCommand[] =
    protocolData != null ? analysisCommandsWithStatus : []

  const firstNonSetupIndex = allProtocolCommands.findIndex(
    command =>
      command.commandType !== 'loadLabware' &&
      command.commandType !== 'loadPipette' &&
      command.commandType !== 'loadModule'
  )
  const protocolSetupCommandList = allProtocolCommands.slice(
    0,
    firstNonSetupIndex
  )
  const postSetupAnticipatedCommands: RunTimeCommand[] = allProtocolCommands.slice(
    firstNonSetupIndex
  )

  let currentCommandList: CommandRuntimeInfo[] = postSetupAnticipatedCommands.map(
    postSetupAnticaptedCommand => ({
      analysisCommand: postSetupAnticaptedCommand,
      runCommandSummary: null,
    })
  )
  let postPlayRunCommands: CommandRuntimeInfo[] = []
  if (runCommands != null && runCommands.length > 0 && runStartTime != null) {
    const firstPostPlayRunCommandIndex = runCommands.findIndex(
      command => command.key === postSetupAnticipatedCommands[0]?.key
    )
    postPlayRunCommands =
      firstPostPlayRunCommandIndex >= 0
        ? runCommands
            .slice(firstPostPlayRunCommandIndex)
            .map(runDataCommand => ({
              runCommandSummary: runDataCommand,
              analysisCommand:
                postSetupAnticipatedCommands.find(
                  postSetupAnticipatedCommand =>
                    runDataCommand.key === postSetupAnticipatedCommand.key
                ) ?? null,
            }))
        : []

    const allCommands = allProtocolCommands.map((anticipatedCommand, index) => {
      const isAnticipated = index + 1 > totalRunCommandCount
      const matchedRunCommand = runCommands.find(
        runCommandSummary => runCommandSummary.key === anticipatedCommand.key
      )
      if (!isAnticipated && matchedRunCommand != null) {
        return {
          analysisCommand: anticipatedCommand,
          runCommandSummary: matchedRunCommand,
        }
      } else {
        return {
          analysisCommand: anticipatedCommand,
          runCommandSummary: null,
        }
      }
    })

    // const remainingAnticipatedCommands = dropWhile(
    //   postSetupAnticipatedCommands,
    //   anticipatedCommand =>
    //     runCommands.some(runC => runC.key === anticipatedCommand.key)
    // ).map(remainingAnticipatedCommand => ({
    //   analysisCommand: remainingAnticipatedCommand,
    //   runCommandSummary: null,
    // }))

    // const isProtocolDeterministic = postPlayRunCommands.reduce(
    //   (isDeterministic, command, index) => {
    //     return (
    //       isDeterministic &&
    //       command.runCommandSummary?.key ===
    //         postSetupAnticipatedCommands[index]?.key
    //     )
    //   },
    //   true
    // )
    // TODO: implement deterministic check
    const isProtocolDeterministic = true

    currentCommandList = allCommands.slice(firstNonSetupIndex)
  }

  const windowFirstCommandIndex = WINDOW_OVERLAP * windowIndex
  const commandWindow = currentCommandList.slice(
    windowFirstCommandIndex,
    windowFirstCommandIndex + WINDOW_SIZE
  )
  const isFirstWindow = windowIndex === 0
  const isFinalWindow =
    currentCommandList.length - 1 <= windowFirstCommandIndex + WINDOW_SIZE

  const currentCommandIndex =
    totalRunCommandCount - 1 - protocolSetupCommandList.length
  const indexOfWindowContainingCurrentItem = Math.floor(
    Math.max(currentCommandIndex - (WINDOW_SIZE - WINDOW_OVERLAP), 0) /
      WINDOW_OVERLAP
  )

  // when we initially mount, if the current item is not in view, jump to it
  React.useEffect(() => {
    if (indexOfWindowContainingCurrentItem !== windowIndex) {
      setWindowIndex(indexOfWindowContainingCurrentItem)
    }
    setIsInitiallyJumpingToCurrent(true)
  }, [])

  // if jumping to current item and on correct window index, scroll to current item
  React.useEffect(() => {
    if (
      isInitiallyJumpingToCurrent &&
      windowIndex === indexOfWindowContainingCurrentItem
    ) {
      currentItemRef.current?.scrollIntoView({ behavior: 'smooth' })
      setIsInitiallyJumpingToCurrent(false)
    }
  }, [windowIndex, isInitiallyJumpingToCurrent])

  if (protocolData == null || runStatus == null) return null

  let alertItemTitle
  if (runStatus === 'failed') {
    alertItemTitle = t('protocol_run_failed')
  }
  if (
    runStatus === RUN_STATUS_STOP_REQUESTED ||
    runStatus === RUN_STATUS_STOPPED
  ) {
    alertItemTitle = t('protocol_run_canceled')
  }
  if (runStatus === RUN_STATUS_SUCCEEDED) {
    alertItemTitle = t('protocol_run_complete')
  }

  const onScroll = (): void => {
    if (listInnerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listInnerRef.current
      if (
        scrollTop + clientHeight + EAGER_BUFFER_COEFFICIENT * clientHeight >=
          scrollHeight &&
        !isFinalWindow
      ) {
        const potentialNextWindowFirstIndex =
          windowFirstCommandIndex + WINDOW_OVERLAP
        if (potentialNextWindowFirstIndex < currentCommandList.length) {
          setWindowIndex(windowIndex + 1)
          if (potentialNextWindowFirstIndex <= totalRunCommandCount) {
            setCommandCursorIndex(potentialNextWindowFirstIndex)
          }
        }
      } else if (scrollTop <= EAGER_BUFFER_COEFFICIENT * clientHeight) {
        const potentialPrevWindowFirstIndex =
          windowFirstCommandIndex - WINDOW_OVERLAP
        if (windowIndex > 0 && potentialPrevWindowFirstIndex >= 0) {
          setWindowIndex(windowIndex - 1)
          listInnerRef.current?.scrollTo({ top: 1 })
          if (potentialPrevWindowFirstIndex <= totalRunCommandCount) {
            setCommandCursorIndex(potentialPrevWindowFirstIndex)
          }
        }
      }
    }
  }

  return (
    <Box
      height="calc(100vh - 3rem)" // height of viewport minus titlebar
      width="100%"
      ref={listInnerRef}
      onScroll={onScroll}
      overflowY="scroll"
    >
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING_2}>
        {isFirstWindow ? (
          <>
            {([
              RUN_STATUS_FAILED,
              RUN_STATUS_SUCCEEDED,
              RUN_STATUS_STOP_REQUESTED,
              RUN_STATUS_STOPPED,
            ] as RunStatus[]).includes(runStatus) ? (
              <Box padding={`${SPACING_2} ${SPACING_2} ${SPACING_2} 0`}>
                <AlertItem
                  type={
                    ([
                      RUN_STATUS_STOP_REQUESTED,
                      RUN_STATUS_FAILED,
                      RUN_STATUS_STOPPED,
                    ] as RunStatus[]).includes(runStatus)
                      ? 'error'
                      : 'success'
                  }
                  title={alertItemTitle}
                />
              </Box>
            ) : null}
            <Flex
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              alignItems={ALIGN_CENTER}
            >
              <Text
                paddingY={SPACING_2}
                css={FONT_HEADER_DARK}
                textTransform={TEXT_TRANSFORM_CAPITALIZE}
              >
                {t('protocol_steps')}
              </Text>
              <Text fontSize={FONT_SIZE_CAPTION} paddingY={SPACING_1}>
                {t('total_step_count', { count: currentCommandList.length })}
              </Text>
            </Flex>
            {currentCommandIndex <= 0 ? (
              <Text fontSize={FONT_SIZE_CAPTION} marginY={SPACING_2}>
                {t('anticipated')}
              </Text>
            ) : null}
            {protocolSetupCommandList.length > 0 ? (
              <ProtocolSetupItem
                protocolSetupCommandList={protocolSetupCommandList}
              />
            ) : null}
          </>
        ) : null}
        <Flex
          fontSize={FONT_SIZE_CAPTION}
          color={C_MED_DARK_GRAY}
          flexDirection={DIRECTION_COLUMN}
        >
          {commandWindow?.map((command, index) => {
            const overallIndex = index + windowFirstCommandIndex
            const isCurrentCommand = overallIndex === currentCommandIndex
            const showAnticipatedStepsTitle =
              overallIndex !== currentCommandList.length - 1 && isCurrentCommand

            return (
              <Flex
                key={
                  command.analysisCommand?.id ?? command.runCommandSummary?.id
                }
                justifyContent={JUSTIFY_START}
                flexDirection={DIRECTION_COLUMN}
                ref={isCurrentCommand ? currentItemRef : undefined}
                marginBottom={SPACING_2}
              >
                <CommandItem
                  analysisCommand={command.analysisCommand}
                  runCommandSummary={command.runCommandSummary}
                  hasBeenRun={overallIndex <= currentCommandIndex}
                  runStatus={runStatus}
                  stepNumber={overallIndex + 1}
                  runStartedAt={runStartTime}
                />
                {showAnticipatedStepsTitle && (
                  <Text
                    fontSize={FONT_SIZE_CAPTION}
                    margin={`${SPACING_3} 0 ${SPACING_2}`}
                  >
                    {t('anticipated')}
                  </Text>
                )}
              </Flex>
            )
          })}
          {isFinalWindow ? (
            <Text paddingY={SPACING_1} marginBottom="98vh">
              {t('end_of_protocol')}
            </Text>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  )
}

interface ProtocolSetupItemProps {
  protocolSetupCommandList: RunTimeCommand[]
}
function ProtocolSetupItem(props: ProtocolSetupItemProps): JSX.Element {
  const { protocolSetupCommandList } = props
  const [
    showProtocolSetupInfo,
    setShowProtocolSetupInfo,
  ] = React.useState<boolean>(false)
  const { t } = useTranslation('run_details')

  return (
    <Flex marginY={SPACING_2}>
      {showProtocolSetupInfo ? (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          padding={SPACING_2}
          backgroundColor={C_NEAR_WHITE}
          width="100%"
          alignSelf={ALIGN_STRETCH}
          alignItems={ALIGN_STRETCH}
        >
          <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} color={C_MED_DARK_GRAY}>
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              fontSize={FONT_SIZE_CAPTION}
              marginBottom={SPACING_2}
              id={`RunDetails_ProtocolSetupTitle`}
            >
              {t('protocol_setup')}
            </Text>
            <Btn size={SIZE_1} onClick={() => setShowProtocolSetupInfo(false)}>
              <Icon name="chevron-up" color={C_MED_DARK_GRAY} />
            </Btn>
          </Flex>
          <Flex
            id={`RunDetails_ProtocolSetup_CommandList`}
            flexDirection={DIRECTION_COLUMN}
          >
            {protocolSetupCommandList.map(command => (
              <ProtocolSetupInfo key={command.id} setupCommand={command} />
            ))}
          </Flex>
        </Flex>
      ) : (
        <Btn
          width="100%"
          role="link"
          onClick={() => setShowProtocolSetupInfo(true)}
        >
          <Flex
            fontSize={FONT_SIZE_CAPTION}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            textTransform={TEXT_TRANSFORM_UPPERCASE}
            color={C_MED_DARK_GRAY}
            backgroundColor={C_NEAR_WHITE}
          >
            <Text padding={SPACING_2}>{t('protocol_setup')}</Text>
            <Icon name={'chevron-left'} width={SIZE_1} />
          </Flex>
        </Btn>
      )}
    </Flex>
  )
}
