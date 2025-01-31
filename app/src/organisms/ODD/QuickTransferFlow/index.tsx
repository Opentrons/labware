import { useState, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  POSITION_STICKY,
  StepMeter,
  useConditionalConfirm,
} from '@opentrons/components'
import { ANALYTICS_QUICK_TRANSFER_EXIT_EARLY } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ConfirmExitModal } from './ConfirmExitModal'
import { CreateNewTransfer } from './CreateNewTransfer'
import { SelectPipette } from './SelectPipette'
import { SelectTipRack } from './SelectTipRack'
import { SelectSourceLabware } from './SelectSourceLabware'
import { SelectSourceWells } from './SelectSourceWells'
import { SelectDestLabware } from './SelectDestLabware'
import { SelectDestWells } from './SelectDestWells'
import { VolumeEntry } from './VolumeEntry'
import { SummaryAndSettings } from './SummaryAndSettings'
import { quickTransferWizardReducer } from './reducers'

import type { ComponentProps } from 'react'
import type { SmallButton } from '/app/atoms/buttons'
import type { QuickTransferWizardState } from './types'

const QUICK_TRANSFER_WIZARD_STEPS = 8
const initialQuickTransferState: QuickTransferWizardState = {}

export const QuickTransferFlow = (): JSX.Element => {
  const navigate = useNavigate()
  const { i18n, t } = useTranslation(['quick_transfer', 'shared'])
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const [state, dispatch] = useReducer(
    quickTransferWizardReducer,
    initialQuickTransferState
  )
  const [currentStep, setCurrentStep] = useState(0)

  const [analyticsStartTime] = useState<Date>(new Date())

  const {
    confirm: confirmExit,
    showConfirmation: showConfirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {
    trackEventWithRobotSerial({
      name: ANALYTICS_QUICK_TRANSFER_EXIT_EARLY,
      properties: {
        step: currentStep,
      },
    })
    navigate('/quick-transfer')
  }, true)

  const exitButtonProps: ComponentProps<typeof SmallButton> = {
    buttonType: 'tertiaryLowLight',
    buttonText: i18n.format(t('shared:exit'), 'capitalize'),
    onClick: confirmExit,
  }
  const sharedMiddleStepProps = {
    state,
    dispatch,
    onBack: () => {
      setCurrentStep(prevStep => prevStep - 1)
    },
    onNext: () => {
      setCurrentStep(prevStep => prevStep + 1)
    },
    exitButtonProps,
  }

  const contentInOrder: JSX.Element[] = [
    <CreateNewTransfer
      key={0}
      onNext={() => {
        setCurrentStep(prevStep => prevStep + 1)
      }}
      exitButtonProps={exitButtonProps}
    />,
    <SelectPipette key={1} {...sharedMiddleStepProps} />,
    <SelectTipRack key={2} {...sharedMiddleStepProps} />,
    <SelectSourceLabware key={3} {...sharedMiddleStepProps} />,
    <SelectSourceWells key={4} {...sharedMiddleStepProps} />,
    <SelectDestLabware key={5} {...sharedMiddleStepProps} />,
    <SelectDestWells key={6} {...sharedMiddleStepProps} />,
    <VolumeEntry key={7} {...sharedMiddleStepProps} />,
    <SummaryAndSettings
      key={8}
      {...sharedMiddleStepProps}
      analyticsStartTime={analyticsStartTime}
    />,
  ]

  return (
    <>
      {showConfirmExit ? (
        <ConfirmExitModal confirmExit={confirmExit} cancelExit={cancelExit} />
      ) : (
        <>
          {currentStep < QUICK_TRANSFER_WIZARD_STEPS ? (
            <StepMeter
              totalSteps={QUICK_TRANSFER_WIZARD_STEPS}
              currentStep={currentStep + 1}
              position={POSITION_STICKY}
              top="0"
            />
          ) : null}
          {contentInOrder[currentStep]}
        </>
      )}
    </>
  )
}
