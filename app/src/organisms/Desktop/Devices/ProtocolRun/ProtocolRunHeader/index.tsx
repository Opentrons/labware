import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from 'styled-components'

import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
} from '@opentrons/components'
import { useModulesQuery } from '@opentrons/react-api-client'
import { RUN_STATUS_IDLE, RUN_STATUS_RUNNING } from '@opentrons/api-client'

import { useIsRobotViewable } from '/app/redux-resources/robots'
import { RunProgressMeter } from '../../../RunProgressMeter'
import {
  useNotifyRunQuery,
  useProtocolDetailsForRun,
  useRunStatus,
} from '/app/resources/runs'
import { RunHeaderProtocolName } from './RunHeaderProtocolName'
import {
  RunHeaderModalContainer,
  useRunHeaderModalContainer,
} from './RunHeaderModalContainer'
import { RunHeaderBannerContainer } from './RunHeaderBannerContainer'
import { useRunAnalytics, useRunErrors, useRunHeaderRunControls } from './hooks'
import { RunHeaderContent } from './RunHeaderContent'
import { EQUIPMENT_POLL_MS } from './constants'
import { isCancellableStatus } from './utils'

import type { RefObject } from 'react'

export interface ProtocolRunHeaderProps {
  protocolRunHeaderRef: RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
  makeHandleJumpToStep: (index: number) => () => void
}

export function ProtocolRunHeader(
  props: ProtocolRunHeaderProps
): JSX.Element | null {
  const { protocolRunHeaderRef, robotName, runId } = props

  const navigate = useNavigate()

  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const { protocolData } = useProtocolDetailsForRun(runId)
  const isRobotViewable = useIsRobotViewable(robotName)
  const runStatus = useRunStatus(runId)
  const attachedModules =
    useModulesQuery({
      refetchInterval: EQUIPMENT_POLL_MS,
      enabled: isCancellableStatus(runStatus),
    })?.data?.data ?? []
  const runErrors = useRunErrors({
    runRecord: runRecord ?? null,
    runStatus,
    runId,
  })

  const enteredER = runRecord?.data.hasEverEnteredErrorRecovery ?? false
  const protocolRunControls = useRunHeaderRunControls(runId, robotName)
  const runHeaderModalContainerUtils = useRunHeaderModalContainer({
    ...props,
    attachedModules,
    runStatus,
    protocolRunControls,
    runRecord: runRecord ?? null,
    runErrors,
  })

  useEffect(() => {
    if (protocolData != null && !isRobotViewable) {
      navigate('/devices')
    }
  }, [protocolData, isRobotViewable, navigate])

  // To persist "run again" loading conditions into a new run, we need a scalar that persists longer than
  // the runControl isResetRunLoading, which completes before we want to change user-facing copy/CTAs.
  const isResetRunLoadingRef = useRef(false)
  if (runStatus === RUN_STATUS_IDLE || runStatus === RUN_STATUS_RUNNING) {
    isResetRunLoadingRef.current = false
  }

  useRunAnalytics({ runId, robotName, enteredER })

  return (
    <>
      <RunHeaderModalContainer
        runStatus={runStatus}
        runHeaderModalContainerUtils={runHeaderModalContainerUtils}
        runErrors={runErrors}
        protocolRunControls={protocolRunControls}
        {...props}
      />
      <Flex ref={protocolRunHeaderRef} css={CONTAINER_STYLE}>
        <RunHeaderProtocolName runId={runId} />
        <RunHeaderBannerContainer
          runStatus={runStatus}
          enteredER={enteredER}
          isResetRunLoading={isResetRunLoadingRef.current}
          runErrors={runErrors}
          runHeaderModalContainerUtils={runHeaderModalContainerUtils}
          hasDownloadableFiles={
            runRecord?.data != null &&
            'outputFileIds' in runRecord.data &&
            runRecord.data.outputFileIds.length > 0
          }
          {...props}
        />
        <RunHeaderContent
          runStatus={runStatus}
          isResetRunLoadingRef={isResetRunLoadingRef}
          attachedModules={attachedModules}
          protocolRunControls={protocolRunControls}
          runHeaderModalContainerUtils={runHeaderModalContainerUtils}
          {...props}
        />
        <RunProgressMeter {...props} />
      </Flex>
    </>
  )
}

const CONTAINER_STYLE = css`
  background-color: ${COLORS.white};
  border-radius: ${BORDERS.borderRadius8};
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing16};
  margin-bottom: ${SPACING.spacing16};
  padding: ${SPACING.spacing16};
`
