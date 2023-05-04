import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import {
  SUCCESSFULLY_ATTACHED,
  SUCCESSFULLY_ATTACHED_AND_CALIBRATED,
  SUCCESSFULLY_CALIBRATED,
  SUCCESSFULLY_DETACHED,
} from './constants'
import type { GripperWizardStepProps, SuccessStep } from './types'
import {
  COLORS,
  TEXT_TRANSFORM_CAPITALIZE,
  PrimaryButton,
} from '@opentrons/components'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

export const Success = (
  props: Pick<GripperWizardStepProps, 'proceed'> & SuccessStep
): JSX.Element => {
  const { proceed, successfulAction } = props
  const { t } = useTranslation(['gripper_wizard_flows', 'shared'])

  const infoByAction: {
    [action in SuccessStep['successfulAction']]: {
      header: string
      buttonText: string
    }
  } = {
    [SUCCESSFULLY_ATTACHED_AND_CALIBRATED]: {
      header: t('gripper_successfully_attached_and_calibrated'),
      buttonText: t('shared:exit'),
    },
    [SUCCESSFULLY_CALIBRATED]: {
      header: t('gripper_successfully_calibrated'),
      buttonText: t('shared:exit'),
    },
    [SUCCESSFULLY_ATTACHED]: {
      header: t('gripper_successfully_attached'),
      buttonText: t('calibrate_gripper'),
    },
    [SUCCESSFULLY_DETACHED]: {
      header: t('gripper_successfully_detached'),
      buttonText: t('shared:exit'),
    },
  }
  const { header, buttonText } = infoByAction[successfulAction]

  return (
    <SimpleWizardBody
      iconColor={COLORS.successEnabled}
      header={header}
      isSuccess
    >
      <PrimaryButton
        textTransform={TEXT_TRANSFORM_CAPITALIZE}
        onClick={proceed}
      >
        {buttonText}
      </PrimaryButton>
    </SimpleWizardBody>
  )
}
