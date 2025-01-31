import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { ModalShell } from '@opentrons/components'

import { getTopPortalEl } from '/app/App/portal'
import {
  BeforeBeginning,
  HandleLabware,
  AttachProbe,
  DetachProbe,
  LPCComplete,
} from '/app/organisms/LabwarePositionCheck/steps'
import { ExitConfirmation } from './ExitConfirmation'
import { RobotMotionLoader } from './RobotMotionLoader'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { LPCErrorModal } from './LPCErrorModal'
import {
  useLPCCommands,
  useLPCInitialState,
} from '/app/organisms/LabwarePositionCheck/hooks'
import {
  closeLPC,
  proceedStep,
  LPC_STEP,
  selectCurrentStep,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCFlowsProps } from '/app/organisms/LabwarePositionCheck/LPCFlows'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { State } from '/app/redux/types'
import { useEffect } from 'react'

export interface LPCWizardFlexProps extends Omit<LPCFlowsProps, 'robotType'> {}

export function LPCWizardFlex(props: LPCWizardFlexProps): JSX.Element {
  const { onCloseClick, ...rest } = props

  const proceed = (): void => {
    dispatch(proceedStep(props.runId))
  }
  const onCloseClickDispatch = (): void => {
    onCloseClick()
  }
  const dispatch = useDispatch()
  const LPCHandlerUtils = useLPCCommands({
    ...props,
    onCloseClick: onCloseClickDispatch,
  })

  useLPCInitialState({ ...rest })

  // Clean up state on LPC close.
  useEffect(() => {
    return () => {
      dispatch(closeLPC(props.runId))
    }
  }, [])

  return (
    <LPCWizardFlexComponent
      {...props}
      proceed={proceed}
      commandUtils={LPCHandlerUtils}
      onCloseClick={onCloseClickDispatch}
    />
  )
}

function LPCWizardFlexComponent(props: LPCWizardContentProps): JSX.Element {
  const isOnDevice = useSelector(getIsOnDevice)

  return isOnDevice ? (
    <>
      <LPCWizardHeader {...props} />
      <LPCWizardContent {...props} />
    </>
  ) : (
    createPortal(
      <ModalShell width="47rem" header={<LPCWizardHeader {...props} />}>
        <LPCWizardContent {...props} />
      </ModalShell>,
      getTopPortalEl()
    )
  )
}

function LPCWizardHeader({
  runId,
  commandUtils,
}: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { currentStepIndex, totalStepCount } = useSelector((state: State) => ({
    currentStepIndex:
      state.protocolRuns[runId]?.lpc?.steps.currentStepIndex ?? 0,
    totalStepCount: state.protocolRuns[runId]?.lpc?.steps.totalStepCount ?? 0,
  }))
  const {
    errorMessage,
    showExitConfirmation,
    isExiting,
    confirmExitLPC,
  } = commandUtils

  // TODO(jh 01-15-24): Revisit the onExit conditions. Can we simplify?
  return (
    <WizardHeader
      title={t('labware_position_check_title')}
      currentStep={errorMessage != null ? undefined : currentStepIndex + 1}
      totalSteps={errorMessage != null ? undefined : totalStepCount}
      onExit={
        showExitConfirmation || isExiting || errorMessage != null
          ? undefined
          : confirmExitLPC
      }
    />
  )
}

function LPCWizardContent(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('shared')
  const currentStep = useSelector(selectCurrentStep(props.runId))
  const {
    isRobotMoving,
    errorMessage,
    showExitConfirmation,
  } = props.commandUtils

  // Handle special cases that are shared by multiple steps first.
  if (isRobotMoving) {
    return <RobotMotionLoader header={t('stand_back_robot_is_in_motion')} />
  }
  if (errorMessage != null) {
    return <LPCErrorModal {...props} />
  }
  if (showExitConfirmation) {
    return <ExitConfirmation {...props} />
  }
  if (currentStep == null) {
    console.error('LPC store not properly initialized.')
    return <></>
  }

  // Handle step-based routing.
  switch (currentStep) {
    case LPC_STEP.BEFORE_BEGINNING:
      return <BeforeBeginning {...props} />

    case LPC_STEP.ATTACH_PROBE:
      return <AttachProbe {...props} />

    case LPC_STEP.HANDLE_LABWARE:
      return <HandleLabware {...props} />

    case LPC_STEP.DETACH_PROBE:
      return <DetachProbe {...props} />

    case LPC_STEP.LPC_COMPLETE:
      return <LPCComplete {...props} />

    default:
      console.error('Unhandled LPC step.')
      return <BeforeBeginning {...props} />
  }
}
