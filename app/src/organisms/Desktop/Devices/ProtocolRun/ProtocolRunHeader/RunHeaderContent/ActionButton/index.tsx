import { RUN_STATUS_STOP_REQUESTED } from '@opentrons/api-client'
import {
  ALIGN_CENTER,
  DISPLAY_FLEX,
  Icon,
  JUSTIFY_CENTER,
  PrimaryButton,
  SIZE_1,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import { useRobot } from '/app/redux-resources/robots'
import { useRobotAnalyticsData } from '/app/redux-resources/analytics'
import {
  useCloseCurrentRun,
  useCurrentRunId,
  useProtocolDetailsForRun,
  useRunCalibrationStatus,
  useUnmatchedModulesForProtocol,
  useModuleCalibrationStatus,
} from '/app/resources/runs'
import { useActionBtnDisabledUtils, useActionButtonProperties } from './hooks'
import { getFallbackRobotSerialNumber, isRunAgainStatus } from '../../utils'
import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'

import type { MutableRefObject } from 'react'
import type { RunHeaderContentProps } from '..'

export type BaseActionButtonProps = RunHeaderContentProps

interface ActionButtonProps extends BaseActionButtonProps {
  isResetRunLoadingRef: MutableRefObject<boolean>
}

export function ActionButton(props: ActionButtonProps): JSX.Element {
  const {
    runId,
    robotName,
    runStatus,
    isResetRunLoadingRef,
    runHeaderModalContainerUtils,
  } = props
  const {
    missingStepsModalUtils,
    HSConfirmationModalUtils,
  } = runHeaderModalContainerUtils

  const [targetProps, tooltipProps] = useHoverTooltip()
  const { isProtocolAnalyzing, protocolData } = useProtocolDetailsForRun(runId)
  const { missingModuleIds } = useUnmatchedModulesForProtocol(robotName, runId)
  const { complete: isCalibrationComplete } = useRunCalibrationStatus(
    robotName,
    runId
  )
  const { complete: isModuleCalibrationComplete } = useModuleCalibrationStatus(
    robotName,
    runId
  )
  const isRobotOnWrongVersionOfSoftware = useIsRobotOnWrongVersionOfSoftware(
    robotName
  )
  const currentRunId = useCurrentRunId()

  const isSetupComplete =
    isCalibrationComplete &&
    isModuleCalibrationComplete &&
    missingModuleIds.length === 0
  const isCurrentRun = currentRunId === runId
  const isOtherRunCurrent = currentRunId != null && currentRunId !== runId
  const isProtocolNotReady = protocolData == null || !!isProtocolAnalyzing
  const isValidRunAgain = isRunAgainStatus(runStatus)
  const { isClosingCurrentRun } = useCloseCurrentRun()

  const { isDisabled, disabledReason } = useActionBtnDisabledUtils({
    isCurrentRun,
    isSetupComplete,
    isOtherRunCurrent,
    isProtocolNotReady,
    isRobotOnWrongVersionOfSoftware,
    isValidRunAgain,
    isClosingCurrentRun,
    ...props,
  })

  const robot = useRobot(robotName)
  const robotSerialNumber = getFallbackRobotSerialNumber(robot)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)

  const validRunAgainButRequiresSetup = isValidRunAgain && !isSetupComplete

  const {
    buttonText,
    handleButtonClick,
    buttonIconName,
  } = useActionButtonProperties({
    isProtocolNotReady,
    confirmMissingSteps: missingStepsModalUtils.conditionalConfirmUtils.confirm,
    confirmAttachment: HSConfirmationModalUtils.conditionalConfirmUtils.confirm,
    robotAnalyticsData,
    robotSerialNumber,
    currentRunId,
    isValidRunAgain,
    isOtherRunCurrent,
    isRobotOnWrongVersionOfSoftware,
    isClosingCurrentRun,
    ...props,
  })

  return (
    <>
      <PrimaryButton
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
        boxShadow="none"
        display={DISPLAY_FLEX}
        padding={`${SPACING.spacing12} ${SPACING.spacing16}`}
        disabled={isDisabled && !validRunAgainButRequiresSetup}
        onClick={handleButtonClick}
        id="ProtocolRunHeader_runControlButton"
        {...targetProps}
      >
        {buttonIconName != null ? (
          <Icon
            name={buttonIconName}
            size={SIZE_1}
            marginRight={SPACING.spacing8}
            spin={
              isProtocolNotReady ||
              runStatus === RUN_STATUS_STOP_REQUESTED ||
              isResetRunLoadingRef.current ||
              isClosingCurrentRun
            }
          />
        ) : null}
        <StyledText as="pSemiBold">{buttonText}</StyledText>
      </PrimaryButton>
      {disabledReason && (
        <Tooltip tooltipProps={tooltipProps} width="auto" maxWidth="8rem">
          {disabledReason}
        </Tooltip>
      )}
    </>
  )
}
