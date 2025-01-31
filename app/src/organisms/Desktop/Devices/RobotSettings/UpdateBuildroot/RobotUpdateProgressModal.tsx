import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_FLEX_END,
  NewPrimaryBtn,
  SPACING,
  Modal,
  LegacyStyledText,
} from '@opentrons/components'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { ProgressBar } from '/app/atoms/ProgressBar'
import { FOOTER_BUTTON_STYLE } from './UpdateRobotModal'
import {
  startRobotUpdate,
  clearRobotUpdateSession,
  getRobotUpdateDownloadError,
} from '/app/redux/robot-update'
import { useRobotUpdateInfo } from './useRobotUpdateInfo'
import successIcon from '/app/assets/images/icon_success.png'
import {
  useRobotInitializationStatus,
  INIT_STATUS,
} from '/app/resources/health/hooks'

import type { ChangeEventHandler } from 'react'
import type { State } from '/app/redux/types'
import type { SetStatusBarCreateCommand } from '@opentrons/shared-data/protocol'
import type { RobotUpdateSession } from '/app/redux/robot-update/types'
import type { UpdateStep } from './useRobotUpdateInfo'
import type { RobotInitializationStatus } from '/app/resources/health/hooks'

const UPDATE_PROGRESS_BAR_STYLE = css`
  margin-top: ${SPACING.spacing24};
  margin-bottom: ${SPACING.spacing24};
  border-radius: ${BORDERS.borderRadius8};
  background: ${COLORS.grey30};
  width: 17.12rem;
`
const UPDATE_TEXT_STYLE = css`
  color: ${COLORS.grey50};
  font-size: 0.8rem;
`
const HIDDEN_CSS = css`
  position: fixed;
  clip: rect(1px 1px 1px 1px);
`

interface RobotUpdateProgressModalProps {
  robotName: string
  session: RobotUpdateSession | null
  closeUpdateBuildroot?: () => void
}

export function RobotUpdateProgressModal({
  robotName,
  session,
  closeUpdateBuildroot,
}: RobotUpdateProgressModalProps): JSX.Element {
  const dispatch = useDispatch()
  const { t } = useTranslation('device_settings')
  const [showFileSelect, setShowFileSelect] = useState<boolean>(false)
  const installFromFileRef = useRef<HTMLInputElement>(null)

  const completeRobotUpdateHandler = (): void => {
    if (closeUpdateBuildroot != null) closeUpdateBuildroot()
  }

  const { updateStep, progressPercent } = useRobotUpdateInfo(robotName, session)

  let { error } = session || { error: null }
  const downloadError = useSelector((state: State) =>
    getRobotUpdateDownloadError(state, robotName)
  )
  if (error == null && downloadError != null) error = downloadError

  useStatusBarAnimation(error != null)
  useCleanupRobotUpdateSessionOnDismount()

  const handleFileSelect: ChangeEventHandler<HTMLInputElement> = event => {
    const { files } = event.target
    if (files?.length === 1) {
      dispatch(startRobotUpdate(robotName, files[0].path))
    }
    setShowFileSelect(false)
  }
  useEffect(() => {
    if (showFileSelect && installFromFileRef.current)
      installFromFileRef.current.click()
  }, [showFileSelect])

  const robotInitStatus = useRobotInitializationStatus()
  const hasRobotCompletedInit =
    updateStep === 'finished' && robotInitStatus !== INIT_STATUS.INITIALIZING
  const letUserExitUpdate = useAllowExitIfUpdateStalled(
    updateStep,
    progressPercent,
    robotInitStatus
  )
  const { modalBodyText, subProgressBarText } = useGetModalText(
    updateStep,
    letUserExitUpdate,
    robotName,
    robotInitStatus
  )

  return (
    <Modal
      title={`${t('updating')} ${robotName}`}
      width="40rem"
      textAlign="center"
      marginLeft="0"
      onClose={
        hasRobotCompletedInit || error || letUserExitUpdate
          ? completeRobotUpdateHandler
          : undefined
      }
      footer={
        hasRobotCompletedInit || error ? (
          <RobotUpdateProgressFooter
            closeUpdateBuildroot={completeRobotUpdateHandler}
          />
        ) : null
      }
    >
      {hasRobotCompletedInit || error ? (
        <Flex flexDirection={DIRECTION_COLUMN} alignItems={ALIGN_CENTER}>
          <SuccessOrError errorMessage={error} />
        </Flex>
      ) : (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          alignItems={ALIGN_CENTER}
          padding={SPACING.spacing48}
        >
          <LegacyStyledText>{modalBodyText}</LegacyStyledText>
          <ProgressBar
            percentComplete={progressPercent}
            outerStyles={UPDATE_PROGRESS_BAR_STYLE}
          />
          <LegacyStyledText css={UPDATE_TEXT_STYLE}>
            {letUserExitUpdate &&
            updateStep !== 'restart' &&
            updateStep !== 'finished' ? (
              <>
                {t('problem_during_update')} {t('try_restarting_the_update')}
                {showFileSelect && (
                  <input
                    ref={installFromFileRef}
                    type="file"
                    onChange={handleFileSelect}
                    css={HIDDEN_CSS}
                  />
                )}
              </>
            ) : (
              subProgressBarText
            )}
          </LegacyStyledText>
        </Flex>
      )}
    </Modal>
  )
}

interface RobotUpdateProgressFooterProps {
  closeUpdateBuildroot?: () => void
}

function RobotUpdateProgressFooter({
  closeUpdateBuildroot,
}: RobotUpdateProgressFooterProps): JSX.Element {
  const { t } = useTranslation('device_settings')

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_FLEX_END}>
      <NewPrimaryBtn
        onClick={closeUpdateBuildroot}
        marginRight={SPACING.spacing12}
        css={FOOTER_BUTTON_STYLE}
      >
        {t('exit')}
      </NewPrimaryBtn>
    </Flex>
  )
}

interface SuccessOrErrorProps {
  errorMessage?: string | null
}

function SuccessOrError({ errorMessage }: SuccessOrErrorProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const IMAGE_ALT = 'Welcome screen background image'
  let renderedImg: JSX.Element
  if (!errorMessage)
    renderedImg = (
      <img alt={IMAGE_ALT} src={successIcon} height="208px" width="250px" />
    )
  else
    renderedImg = (
      <Icon
        name="alert-circle"
        height="40px"
        color={COLORS.red50}
        margin={SPACING.spacing24}
      />
    )

  return (
    <>
      {renderedImg}
      <LegacyStyledText>
        {!errorMessage ? t('robot_update_success') : errorMessage}
      </LegacyStyledText>
    </>
  )
}

export const TIME_BEFORE_ALLOWING_EXIT = 600000 // 10 mins
export const TIME_BEFORE_ALLOWING_EXIT_INIT = 2400000 // 40 mins. Account for tasks like DB migration.

function useAllowExitIfUpdateStalled(
  updateStep: UpdateStep | null,
  progressPercent: number,
  robotInitStatus: RobotInitializationStatus
): boolean {
  const [letUserExitUpdate, setLetUserExitUpdate] = useState<boolean>(false)
  const prevSeenUpdateProgress = useRef<number | null>(null)
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (updateStep === 'initial' && prevSeenUpdateProgress.current !== null) {
      prevSeenUpdateProgress.current = null
    } else if (progressPercent !== prevSeenUpdateProgress.current) {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = setTimeout(() => {
        setLetUserExitUpdate(true)
      }, TIME_BEFORE_ALLOWING_EXIT)

      prevSeenUpdateProgress.current = progressPercent
      setLetUserExitUpdate(false)
    } else if (robotInitStatus === INIT_STATUS.INITIALIZING) {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = setTimeout(() => {
        setLetUserExitUpdate(true)
      }, TIME_BEFORE_ALLOWING_EXIT_INIT)
    }
  }, [progressPercent, updateStep, robotInitStatus])

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
    }
  }, [])

  return letUserExitUpdate
}

function useStatusBarAnimation(isError: boolean): void {
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const updatingCommand: SetStatusBarCreateCommand = {
    commandType: 'setStatusBar',
    params: { animation: 'updating' },
  }
  const idleCommand: SetStatusBarCreateCommand = {
    commandType: 'setStatusBar',
    params: { animation: 'idle' },
  }

  const startUpdatingAnimation = (): void => {
    createLiveCommand({
      command: updatingCommand,
      waitUntilComplete: false,
    }).catch((e: Error) => {
      console.warn(`cannot run status bar animation: ${e.message}`)
    })
  }

  const startIdleAnimationIfFailed = (): void => {
    if (isError) {
      createLiveCommand({
        command: idleCommand,
        waitUntilComplete: false,
      }).catch((e: Error) => {
        console.warn(`cannot run status bar animation: ${e.message}`)
      })
    }
  }

  useEffect(startUpdatingAnimation, [])
  useEffect(startIdleAnimationIfFailed, [isError])
}

function useCleanupRobotUpdateSessionOnDismount(): void {
  const dispatch = useDispatch()
  useEffect(() => {
    return () => {
      dispatch(clearRobotUpdateSession())
    }
  }, [])
}

function useGetModalText(
  updateStep: UpdateStep | null,
  letUserExitUpdate: boolean,
  robotName: string,
  robotInitStatus: RobotInitializationStatus
): { modalBodyText: string; subProgressBarText: string } {
  const { t } = useTranslation('device_settings')

  let modalBodyText = ''
  let subProgressBarText = t('do_not_turn_off', { minutes: 15 })
  switch (updateStep) {
    case 'initial':
    case 'error':
      modalBodyText = ''
      break
    case 'download':
      modalBodyText = t('downloading_update')
      break
    case 'install':
      modalBodyText = t('installing_update')
      break
    case 'restart':
      if (robotInitStatus === INIT_STATUS.INITIALIZING) {
        modalBodyText = t('robot_initializing')
        subProgressBarText = t('do_not_turn_off', { minutes: 40 })
      } else {
        modalBodyText = t('restarting_robot')
      }
      if (letUserExitUpdate) {
        subProgressBarText = t('restart_taking_too_long', { robotName })
      }
      break
    default:
      modalBodyText = t('installing_update')
  }

  return { modalBodyText, subProgressBarText }
}
