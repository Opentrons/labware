import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import without from 'lodash/without'
import { useLocation } from 'react-router-dom'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  Flex,
  SPACING,
  StyledText,
  RadioButton,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { WizardBody } from './WizardBody'
import { HandleEnter } from '../../atoms/HandleEnter'

import type { WizardTileProps } from './types'

export function SelectGripper(props: WizardTileProps): JSX.Element | null {
  const { goBack, setValue, proceed, watch } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const location = useLocation()
  const [gripperStatus, setGripperStatus] = useState<'yes' | 'no' | null>(null)
  const additionalEquipment = watch('additionalEquipment')

  const handleGripperSelection = (status: 'yes' | 'no'): void => {
    setGripperStatus(status)
    if (status === 'yes') {
      if (!additionalEquipment.includes('gripper')) {
        setValue('additionalEquipment', [...additionalEquipment, 'gripper'])
      }
    } else {
      setValue('additionalEquipment', without(additionalEquipment, 'gripper'))
    }
  }

  const isDisabled = gripperStatus == null
  const handleProceed = (): void => {
    if (!isDisabled) {
      proceed(1)
    }
  }

  return (
    <HandleEnter onEnter={handleProceed}>
      <WizardBody
        robotType={FLEX_ROBOT_TYPE}
        stepNumber={3}
        header={t('add_gripper')}
        disabled={gripperStatus == null}
        goBack={() => {
          location.state = 'gripper'
          goBack(1)
        }}
        proceed={handleProceed}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
            <StyledText desktopStyle="headingSmallBold">
              {t('need_gripper')}
            </StyledText>
            <Flex gridGap={SPACING.spacing4}>
              <RadioButton
                onChange={() => {
                  handleGripperSelection('yes')
                }}
                buttonLabel={t('shared:yes')}
                buttonValue="yes"
                isSelected={gripperStatus === 'yes'}
              />
              <RadioButton
                onChange={() => {
                  handleGripperSelection('no')
                }}
                buttonLabel={t('shared:no')}
                buttonValue="no"
                isSelected={gripperStatus === 'no'}
              />
            </Flex>
          </Flex>
        </Flex>
      </WizardBody>
    </HandleEnter>
  )
}
